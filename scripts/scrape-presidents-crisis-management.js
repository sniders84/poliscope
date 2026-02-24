// scripts/scrape-presidents-crisis-management.js
// Purpose: Scrape real presidential crisis data from Miller Center + Wikipedia
// Updates public/presidents-crisis-management.json with real crisis events

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const MILLER_CENTER_URL =
  'https://millercenter.org/president/presidential-crises';
const WIKI_CRISIS_URL =
  'https://en.wikipedia.org/wiki/List_of_national_emergencies_in_the_United_States';

const PUBLIC_DIR = path.join(process.cwd(), 'public');
const BOOTSTRAP_PATH = path.join(PUBLIC_DIR, 'presidents-bootstrap.json');
const CRISIS_PATH = path.join(PUBLIC_DIR, 'presidents-crisis-management.json');

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

function severityScore(text) {
  const t = text.toLowerCase();
  if (t.includes('war') || t.includes('attack') || t.includes('terror')) return 5;
  if (t.includes('crisis') || t.includes('emergency')) return 4;
  if (t.includes('conflict') || t.includes('incident')) return 3;
  if (t.includes('dispute')) return 2;
  return 1;
}

function parseMillerCenter(html, nameMap) {
  const $ = cheerio.load(html);
  const results = new Map();

  $('.views-row').each((_, row) => {
    const presName = $(row).find('.president-name').text().trim();
    const crisisTitle = $(row).find('.crisis-title').text().trim();
    const crisisDesc = $(row).find('.crisis-description').text().trim();

    if (!presName || !crisisTitle) return;

    const parts = presName.split(/\s+/);
    const last = parts[parts.length - 1].toLowerCase();
    if (!nameMap.has(last)) return;

    const presidentNumber = nameMap.get(last);

    if (!results.has(presidentNumber)) {
      results.set(presidentNumber, []);
    }

    results.get(presidentNumber).push({
      title: crisisTitle,
      description: crisisDesc,
      source: 'Miller Center',
      severity: severityScore(crisisTitle + ' ' + crisisDesc)
    });
  });

  return results;
}

function parseWikipediaCrises(html, nameMap) {
  const $ = cheerio.load(html);
  const results = new Map();

  $('table.wikitable tbody tr').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length < 3) return;

    const presName = $(cells[0]).text().trim();
    const crisisTitle = $(cells[1]).text().trim();
    const crisisDesc = $(cells[2]).text().trim();

    if (!presName || !crisisTitle) return;

    const parts = presName.split(/\s+/);
    const last = parts[parts.length - 1].toLowerCase();
    if (!nameMap.has(last)) return;

    const presidentNumber = nameMap.get(last);

    if (!results.has(presidentNumber)) {
      results.set(presidentNumber, []);
    }

    results.get(presidentNumber).push({
      title: crisisTitle,
      description: crisisDesc,
      source: 'Wikipedia',
      severity: severityScore(crisisTitle + ' ' + crisisDesc)
    });
  });

  return results;
}

function mergeCrisisData(baseMap, ...sources) {
  const merged = new Map();

  for (const [presNum, record] of baseMap.entries()) {
    merged.set(presNum, {
      ...record,
      majorCrisisEvents: [],
      crisesFaced: 0,
      crisesResolved: 0,
      crisisSeverityIndex: 0
    });
  }

  for (const source of sources) {
    for (const [presNum, events] of source.entries()) {
      if (!merged.has(presNum)) continue;

      const rec = merged.get(presNum);

      for (const ev of events) {
        rec.majorCrisisEvents.push(ev);
      }
    }
  }

  for (const [presNum, rec] of merged.entries()) {
    rec.crisesFaced = rec.majorCrisisEvents.length;
    rec.crisesResolved = rec.majorCrisisEvents.filter(e =>
      e.description.toLowerCase().includes('resolved')
    ).length;

    rec.crisisSeverityIndex = rec.majorCrisisEvents.reduce(
      (sum, e) => sum + (e.severity || 1),
      0
    );
  }

  return merged;
}

async function main() {
  console.log('Loading bootstrap + crisis JSON...');
  const bootstrap = loadJson(BOOTSTRAP_PATH);
  const crisisData = loadJson(CRISIS_PATH);

  const nameMap = buildPresidentNameMap(bootstrap);
  const crisisByNumber = indexByPresidentNumber(crisisData);

  console.log('Fetching Miller Center crisis data...');
  const millerHtml = await fetchHtml(MILLER_CENTER_URL);
  const millerMap = parseMillerCenter(millerHtml, nameMap);

  console.log('Fetching Wikipedia crisis data...');
  const wikiHtml = await fetchHtml(WIKI_CRISIS_URL);
  const wikiMap = parseWikipediaCrises(wikiHtml, nameMap);

  console.log('Merging crisis data...');
  const merged = mergeCrisisData(crisisByNumber, millerMap, wikiMap);

  const outArray = Array.from(merged.values()).sort(
    (a, b) => a.presidentNumber - b.presidentNumber
  );

  saveJson(CRISIS_PATH, outArray);

  console.log('Updated presidents-crisis-management.json with real crisis data.');
}

if (require.main === module) {
  main().catch(err => {
    console.error('Error in scrape-presidents-crisis-management:', err);
    process.exit(1);
  });
}
