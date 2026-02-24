// scripts/scrape-presidents-domestic-policy.js
// Purpose: Scrape real domestic policy data from Congress.gov, GovTrack, and White House Archives
// Updates public/presidents-domestic-policy.json with real domestic policy metrics

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

// REAL DATA SOURCES
const CONGRESS_SIGNED_URL =
  'https://www.congress.gov/bills?q={"source":"legislation","bill-status":"law"}';
const GOVTRACK_VETOES_URL =
  'https://www.govtrack.us/api/v2/veto';
const WHITEHOUSE_INITIATIVES_URL =
  'https://www.whitehouse.gov/briefing-room/statements-releases/';

const PUBLIC_DIR = path.join(process.cwd(), 'public');
const BOOTSTRAP_PATH = path.join(PUBLIC_DIR, 'presidents-bootstrap.json');
const DOMESTIC_PATH = path.join(PUBLIC_DIR, 'presidents-domestic-policy.json');

async function fetchHtml(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }
  return await res.text();
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch JSON ${url}: ${res.status} ${res.statusText}`);
  }
  return await res.json();
}

function loadJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing JSON file: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function saveJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

function buildPresidentNameMap(bootstrap) {
  const map = new Map();
  for (const pres of bootstrap) {
    const name = pres.name || '';
    const parts = name.split(/\s+/);
    const last = parts[parts.length - 1].toLowerCase();
    map.set(last, pres.presidentNumber);
  }
  return map;
}

function indexByPresidentNumber(arr) {
  const map = new Map();
  for (const item of arr) {
    if (
      item &&
      typeof item === 'object' &&
      typeof item.presidentNumber === 'number'
    ) {
      map.set(item.presidentNumber, item);
    }
  }
  return map;
}

// ------------------------------
// PARSERS
// ------------------------------

function parseCongressSigned(html, nameMap) {
  const $ = cheerio.load(html);
  const results = new Map();

  $('li.expanded').each((_, li) => {
    const title = $(li).find('.result-heading a').text().trim();
    const summary = $(li).find('.result-item').text().trim();
    const presName = summary.match(/Signed by President ([A-Za-z\s]+)/i);

    if (!presName) return;

    const last = presName[1].trim().split(/\s+/).pop().toLowerCase();
    if (!nameMap.has(last)) return;

    const presidentNumber = nameMap.get(last);

    if (!results.has(presidentNumber)) {
      results.set(presidentNumber, []);
    }

    results.get(presidentNumber).push({
      title,
      description: summary,
      source: 'Congress.gov'
    });
  });

  return results;
}

function parseGovTrackVetoes(json, nameMap) {
  const results = new Map();

  json.objects.forEach(veto => {
    const presName = veto.president;
    if (!presName) return;

    const last = presName.trim().split(/\s+/).pop().toLowerCase();
    if (!nameMap.has(last)) return;

    const presidentNumber = nameMap.get(last);

    if (!results.has(presidentNumber)) {
      results.set(presidentNumber, []);
    }

    results.get(presidentNumber).push({
      title: veto.bill || 'Veto',
      description: veto.description || '',
      source: 'GovTrack'
    });
  });

  return results;
}

function parseWhiteHouseInitiatives(html, nameMap) {
  const $ = cheerio.load(html);
  const results = new Map();

  $('.briefing-statement').each((_, el) => {
    const title = $(el).find('h2').text().trim();
    const summary = $(el).find('p').first().text().trim();

    const presNameMatch = summary.match(/President ([A-Za-z\s]+)/i);
    if (!presNameMatch) return;

    const last = presNameMatch[1].trim().split(/\s+/).pop().toLowerCase();
    if (!nameMap.has(last)) return;

    const presidentNumber = nameMap.get(last);

    if (!results.has(presidentNumber)) {
      results.set(presidentNumber, []);
    }

    results.get(presidentNumber).push({
      title,
      description: summary,
      source: 'White House Archives'
    });
  });

  return results;
}

// ------------------------------
// MERGE LOGIC
// ------------------------------

function mergeDomesticData(baseMap, signedMap, vetoMap, initiativesMap) {
  const merged = new Map();

  for (const [presNum, record] of baseMap.entries()) {
    merged.set(presNum, {
      ...record,
      majorDomesticEvents: [],
      majorBillsSigned: 0,
      vetoes: 0,
      domesticProgramsLaunched: 0
    });
  }

  for (const [presNum, events] of signedMap.entries()) {
    const rec = merged.get(presNum);
    rec.majorBillsSigned = events.length;
    rec.majorDomesticEvents.push(...events);
  }

  for (const [presNum, events] of vetoMap.entries()) {
    const rec = merged.get(presNum);
    rec.vetoes = events.length;
    rec.majorDomesticEvents.push(...events);
  }

  for (const [presNum, events] of initiativesMap.entries()) {
    const rec = merged.get(presNum);
    rec.domesticProgramsLaunched = events.length;
    rec.majorDomesticEvents.push(...events);
  }

  return merged;
}

// ------------------------------
// MAIN
// ------------------------------

async function main() {
  console.log('Loading bootstrap + domestic JSON...');
  const bootstrap = loadJson(BOOTSTRAP_PATH);
  const domesticData = loadJson(DOMESTIC_PATH);

  const nameMap = buildPresidentNameMap(bootstrap);
  const domesticByNumber = indexByPresidentNumber(domesticData);

  console.log('Fetching Congress.gov signed bills...');
  const congressHtml = await fetchHtml(CONGRESS_SIGNED_URL);
  const signedMap = parseCongressSigned(congressHtml, nameMap);

  console.log('Fetching GovTrack veto data...');
  const vetoJson = await fetchJson(GOVTRACK_VETOES_URL);
  const vetoMap = parseGovTrackVetoes(vetoJson, nameMap);

  console.log('Fetching White House domestic initiatives...');
  const whHtml = await fetchHtml(WHITEHOUSE_INITIATIVES_URL);
  const initiativesMap = parseWhiteHouseInitiatives(whHtml, nameMap);

  console.log('Merging domestic policy data...');
  const merged = mergeDomesticData(
    domesticByNumber,
    signedMap,
    vetoMap,
    initiativesMap
  );

  const outArray = Array.from(merged.values()).sort(
    (a, b) => a.presidentNumber - b.presidentNumber
  );

  saveJson(DOMESTIC_PATH, outArray);

  console.log('Updated presidents-domestic-policy.json with real domestic policy data.');
}

if (require.main === module) {
  main().catch(err => {
    console.error('Error in scrape-presidents-domestic-policy:', err);
    process.exit(1);
  });
}
