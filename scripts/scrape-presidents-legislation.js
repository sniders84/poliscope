// scripts/scrape-presidents-legislation.js
// Purpose: Scrape real legislative data from Congress.gov + GovTrack
// Updates public/presidents-legislation.json with real legislative metrics

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

// REAL DATA SOURCES
// Congress.gov: Bills signed into law
const CONGRESS_LAWS_URL =
  'https://www.congress.gov/bills?q={"bill-status":"law"}';

// GovTrack API: Bill metadata
const GOVTRACK_BILLS_URL =
  'https://www.govtrack.us/api/v2/bill?congress=all&limit=1000';

const PUBLIC_DIR = path.join(process.cwd(), 'public');
const BOOTSTRAP_PATH = path.join(PUBLIC_DIR, 'presidents-bootstrap.json');
const LEGIS_PATH = path.join(PUBLIC_DIR, 'presidents-legislation.json');

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

function buildPresidentTermMap(bootstrap) {
  const map = new Map();
  for (const pres of bootstrap) {
    const start = pres.termStart ? new Date(pres.termStart) : null;
    const end = pres.termEnd ? new Date(pres.termEnd) : null;
    map.set(pres.presidentNumber, { start, end });
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

function eventBelongsToPresident(date, term) {
  if (!term.start || !term.end) return false;
  const d = new Date(date);
  return d >= term.start && d <= term.end;
}

// ------------------------------
// PARSERS
// ------------------------------

function parseCongressLaws(html, termMap) {
  const $ = cheerio.load(html);
  const results = new Map();

  $('li.expanded').each((_, li) => {
    const title = $(li).find('.result-heading a').text().trim();
    const summary = $(li).find('.result-item').text().trim();
    const dateMatch = summary.match(/Became Law\s+(\d{4}-\d{2}-\d{2})/);

    if (!title || !summary || !dateMatch) return;

    const date = dateMatch[1];

    for (const [presNum, term] of termMap.entries()) {
      if (eventBelongsToPresident(date, term)) {
        if (!results.has(presNum)) results.set(presNum, []);
        results.get(presNum).push({
          title,
          description: summary,
          date,
          source: 'Congress.gov'
        });
      }
    }
  });

  return results;
}

function parseGovTrackBills(json, termMap) {
  const results = new Map();

  const bills = json?.objects || [];
  bills.forEach(bill => {
    const title = bill.title || bill.display_number;
    const date = bill.enacted || bill.vetoed || null;

    if (!title || !date) return;

    for (const [presNum, term] of termMap.entries()) {
      if (eventBelongsToPresident(date, term)) {
        if (!results.has(presNum)) results.set(presNum, []);
        results.get(presNum).push({
          title,
          description: bill.summary || '',
          date,
          source: 'GovTrack'
        });
      }
    }
  });

  return results;
}

// ------------------------------
// MERGE LOGIC
// ------------------------------

function mergeLegislationData(baseMap, congressMap, govtrackMap) {
  const merged = new Map();

  for (const [presNum, record] of baseMap.entries()) {
    merged.set(presNum, {
      ...record,
      legislationPassed: 0,
      majorLegislationEvents: []
    });
  }

  for (const [presNum, events] of congressMap.entries()) {
    const rec = merged.get(presNum);
    rec.majorLegislationEvents.push(...events);
  }

  for (const [presNum, events] of govtrackMap.entries()) {
    const rec = merged.get(presNum);
    rec.majorLegislationEvents.push(...events);
  }

  for (const [presNum, rec] of merged.entries()) {
    rec.legislationPassed = rec.majorLegislationEvents.length;
  }

  return merged;
}

// ------------------------------
// MAIN
// ------------------------------

async function main() {
  console.log('Loading bootstrap + legislation JSON...');
  const bootstrap = loadJson(BOOTSTRAP_PATH);
  const legisData = loadJson(LEGIS_PATH);

  const legisByNumber = indexByPresidentNumber(legisData);
  const termMap = buildPresidentTermMap(bootstrap);

  console.log('Fetching Congress.gov enacted bills...');
  const congressHtml = await fetchHtml(CONGRESS_LAWS_URL);
  const congressMap = parseCongressLaws(congressHtml, termMap);

  console.log('Fetching GovTrack bill metadata...');
  const govJson = await fetchJson(GOVTRACK_BILLS_URL);
  const govtrackMap = parseGovTrackBills(govJson, termMap);

  console.log('Merging legislative data...');
  const merged = mergeLegislationData(legisByNumber, congressMap, govtrackMap);

  const outArray = Array.from(merged.values()).sort(
    (a, b) => a.presidentNumber - b.presidentNumber
  );

  saveJson(LEGIS_PATH, outArray);

  console.log('Updated presidents-legislation.json with real legislative data.');
}

if (require.main === module) {
  main().catch(err => {
    console.error('Error in scrape-presidents-legislation:', err);
    process.exit(1);
  });
}
