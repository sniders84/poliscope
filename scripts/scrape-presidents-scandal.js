// scripts/scrape-presidents-scandal.js
// Purpose: Scrape real scandal/controversy data from Wikipedia + Miller Center
// Updates public/presidents-scandal.json with real scandal metrics

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

// REAL DATA SOURCES
const WIKI_SCANDALS_URL =
  'https://en.wikipedia.org/wiki/List_of_federal_political_scandals_in_the_United_States';

const MILLER_SCANDALS_URL =
  'https://millercenter.org/president/presidential-scandals';

const PUBLIC_DIR = path.join(process.cwd(), 'public');
const BOOTSTRAP_PATH = path.join(PUBLIC_DIR, 'presidents-bootstrap.json');
const SCANDAL_PATH = path.join(PUBLIC_DIR, 'presidents-scandal.json');

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

function parseWikipediaScandals(html, nameMap) {
  const $ = cheerio.load(html);
  const results = new Map();

  $('table.wikitable tbody tr').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length < 3) return;

    const scandalTitle = $(cells[0]).text().trim();
    const presName = $(cells[1]).text().trim();
    const desc = $(cells[2]).text().trim();

    if (!scandalTitle || !presName) return;

    const last = presName.split(/\s+/).pop().toLowerCase();
    if (!nameMap.has(last)) return;

    const presidentNumber = nameMap.get(last);

    if (!results.has(presidentNumber)) results.set(presidentNumber, []);
    results.get(presidentNumber).push({
      title: scandalTitle,
      description: desc,
      source: 'Wikipedia'
    });
  });

  return results;
}

function parseMillerScandals(html, nameMap) {
  const $ = cheerio.load(html);
  const results = new Map();

  $('.views-row').each((_, row) => {
    const presName = $(row).find('.president-name').text().trim();
    const scandalTitle = $(row).find('.scandal-title').text().trim();
    const desc = $(row).find('.scandal-description').text().trim();

    if (!presName || !scandalTitle) return;

    const last = presName.split(/\s+/).pop().toLowerCase();
    if (!nameMap.has(last)) return;

    const presidentNumber = nameMap.get(last);

    if (!results.has(presidentNumber)) results.set(presidentNumber, []);
    results.get(presidentNumber).push({
      title: scandalTitle,
      description: desc,
      source: 'Miller Center'
    });
  });

  return results;
}

// ------------------------------
// MERGE LOGIC
// ------------------------------

function mergeScandalData(baseMap, wikiMap, millerMap) {
  const merged = new Map();

  for (const [presNum, record] of baseMap.entries()) {
    merged.set(presNum, {
      ...record,
      scandalCount: 0,
      majorScandalEvents: []
    });
  }

  for (const [presNum, events] of wikiMap.entries()) {
    const rec = merged.get(presNum);
    rec.majorScandalEvents.push(...events);
  }

  for (const [presNum, events] of millerMap.entries()) {
    const rec = merged.get(presNum);
    rec.majorScandalEvents.push(...events);
  }

  for (const [presNum, rec] of merged.entries()) {
    rec.scandalCount = rec.majorScandalEvents.length;
  }

  return merged;
}

// ------------------------------
// MAIN
// ------------------------------

async function main() {
  console.log('Loading bootstrap + scandal JSON...');
  const bootstrap = loadJson(BOOTSTRAP_PATH);
  const scandalData = loadJson(SCANDAL_PATH);

  const nameMap = buildPresidentNameMap(bootstrap);
  const scandalByNumber = indexByPresidentNumber(scandalData);

  console.log('Fetching Wikipedia scandal data...');
  const wikiHtml = await fetchHtml(WIKI_SCANDALS_URL);
  const wikiMap = parseWikipediaScandals(wikiHtml, nameMap);

  console.log('Fetching Miller Center scandal data...');
  const millerHtml = await fetchHtml(MILLER_SCANDALS_URL);
  const millerMap = parseMillerScandals(millerHtml, nameMap);

  console.log('Merging scandal data...');
  const merged = mergeScandalData(scandalByNumber, wikiMap, millerMap);

  const outArray = Array.from(merged.values()).sort(
    (a, b) => a.presidentNumber - b.presidentNumber
  );

  saveJson(SCANDAL_PATH, outArray);

  console.log('Updated presidents-scandal.json with real scandal data.');
}

if (require.main === module) {
  main().catch(err => {
    console.error('Error in scrape-presidents-scandal:', err);
    process.exit(1);
  });
}
