// scripts/scrape-presidents-judicial-policy.js
// Purpose: Scrape real judicial appointment data from FJC + Wikipedia
// Updates public/presidents-judicial-policy.json with real judicial metrics

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

// REAL DATA SOURCES
const FJC_JUDGES_URL =
  'https://www.fjc.gov/history/judges/search/appointing-president';
const WIKI_JUDGES_URL =
  'https://en.wikipedia.org/wiki/List_of_federal_judges_appointed_by_president';

const PUBLIC_DIR = path.join(process.cwd(), 'public');
const BOOTSTRAP_PATH = path.join(PUBLIC_DIR, 'presidents-bootstrap.json');
const JUDICIAL_PATH = path.join(PUBLIC_DIR, 'presidents-judicial-policy.json');

async function fetchHtml(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }
  return await res.text();
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

function parseFJC(html, nameMap) {
  const $ = cheerio.load(html);
  const results = new Map();

  $('table tbody tr').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length < 4) return;

    const judgeName = $(cells[0]).text().trim();
    const presName = $(cells[3]).text().trim();

    if (!judgeName || !presName) return;

    const last = presName.split(/\s+/).pop().toLowerCase();
    if (!nameMap.has(last)) return;

    const presidentNumber = nameMap.get(last);

    if (!results.has(presidentNumber)) results.set(presidentNumber, []);
    results.get(presidentNumber).push({
      title: judgeName,
      description: `Judicial appointment by ${presName}`,
      source: 'Federal Judicial Center'
    });
  });

  return results;
}

function parseWikipediaJudges(html, nameMap) {
  const $ = cheerio.load(html);
  const results = new Map();

  $('table.wikitable tbody tr').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length < 3) return;

    const judgeName = $(cells[0]).text().trim();
    const presName = $(cells[2]).text().trim();

    if (!judgeName || !presName) return;

    const last = presName.split(/\s+/).pop().toLowerCase();
    if (!nameMap.has(last)) return;

    const presidentNumber = nameMap.get(last);

    if (!results.has(presidentNumber)) results.set(presidentNumber, []);
    results.get(presidentNumber).push({
      title: judgeName,
      description: `Judicial appointment by ${presName}`,
      source: 'Wikipedia'
    });
  });

  return results;
}

// ------------------------------
// MERGE LOGIC
// ------------------------------

function mergeJudicialData(baseMap, fjcMap, wikiMap) {
  const merged = new Map();

  for (const [presNum, record] of baseMap.entries()) {
    merged.set(presNum, {
      ...record,
      judicialAppointments: 0,
      majorJudicialEvents: []
    });
  }

  for (const [presNum, events] of fjcMap.entries()) {
    const rec = merged.get(presNum);
    rec.majorJudicialEvents.push(...events);
  }

  for (const [presNum, events] of wikiMap.entries()) {
    const rec = merged.get(presNum);
    rec.majorJudicialEvents.push(...events);
  }

  for (const [presNum, rec] of merged.entries()) {
    rec.judicialAppointments = rec.majorJudicialEvents.length;
  }

  return merged;
}

// ------------------------------
// MAIN
// ------------------------------

async function main() {
  console.log('Loading bootstrap + judicial JSON...');
  const bootstrap = loadJson(BOOTSTRAP_PATH);
  const judicialData = loadJson(JUDICIAL_PATH);

  const nameMap = buildPresidentNameMap(bootstrap);
  const judicialByNumber = indexByPresidentNumber(judicialData);

  console.log('Fetching Federal Judicial Center data...');
  const fjcHtml = await fetchHtml(FJC_JUDGES_URL);
  const fjcMap = parseFJC(fjcHtml, nameMap);

  console.log('Fetching Wikipedia judicial appointments...');
  const wikiHtml = await fetchHtml(WIKI_JUDGES_URL);
  const wikiMap = parseWikipediaJudges(wikiHtml, nameMap);

  console.log('Merging judicial appointment data...');
  const merged = mergeJudicialData(judicialByNumber, fjcMap, wikiMap);

  const outArray = Array.from(merged.values()).sort(
    (a, b) => a.presidentNumber - b.presidentNumber
  );

  saveJson(JUDICIAL_PATH, outArray);

  console.log('Updated presidents-judicial-policy.json with real judicial appointment data.');
}

if (require.main === module) {
  main().catch(err => {
    console.error('Error in scrape-presidents-judicial-policy:', err);
    process.exit(1);
  });
}
