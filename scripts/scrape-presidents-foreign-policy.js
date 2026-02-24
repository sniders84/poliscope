// scripts/scrape-presidents-foreign-policy.js
// Purpose: Scrape real foreign policy data from State Dept, USAID, and Wikipedia
// Updates public/presidents-foreign-policy.json with real foreign policy metrics

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

// REAL DATA SOURCES
const STATE_TREATIES_URL =
  'https://www.state.gov/treaties-and-other-international-acts-series/';
const USAID_AID_URL =
  'https://explorer.usaid.gov/api/aiddata?f=recipient&size=5000';
const WIKI_CONFLICTS_URL =
  'https://en.wikipedia.org/wiki/List_of_wars_involving_the_United_States';

const PUBLIC_DIR = path.join(process.cwd(), 'public');
const BOOTSTRAP_PATH = path.join(PUBLIC_DIR, 'presidents-bootstrap.json');
const FOREIGN_PATH = path.join(PUBLIC_DIR, 'presidents-foreign-policy.json');

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

function parseStateTreaties(html, termMap) {
  const $ = cheerio.load(html);
  const results = new Map();

  $('article').each((_, el) => {
    const title = $(el).find('h2').text().trim();
    const dateText = $(el).find('time').attr('datetime');

    if (!title || !dateText) return;

    for (const [presNum, term] of termMap.entries()) {
      if (eventBelongsToPresident(dateText, term)) {
        if (!results.has(presNum)) results.set(presNum, []);
        results.get(presNum).push({
          title,
          description: 'Treaty or international act',
          date: dateText,
          source: 'State Department'
        });
      }
    }
  });

  return results;
}

function parseUSAIDAid(json, termMap) {
  const results = new Map();

  const entries = json?.data || [];
  entries.forEach(entry => {
    const year = entry.fiscal_year;
    const amount = entry.current_amount;
    const desc = entry.activity_name;

    if (!year || !amount) return;

    const date = `${year}-01-01`;

    for (const [presNum, term] of termMap.entries()) {
      if (eventBelongsToPresident(date, term)) {
        if (!results.has(presNum)) results.set(presNum, []);
        results.get(presNum).push({
          title: desc || 'Foreign Aid Program',
          description: `Aid amount: $${amount}`,
          date,
          source: 'USAID'
        });
      }
    }
  });

  return results;
}

function parseWikipediaConflicts(html, termMap) {
  const $ = cheerio.load(html);
  const results = new Map();

  $('table.wikitable tbody tr').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length < 3) return;

    const conflict = $(cells[0]).text().trim();
    const years = $(cells[1]).text().trim();

    if (!conflict || !years) return;

    const match = years.match(/(\d{4})/);
    if (!match) return;

    const year = Number(match[1]);
    const date = `${year}-01-01`;

    for (const [presNum, term] of termMap.entries()) {
      if (eventBelongsToPresident(date, term)) {
        if (!results.has(presNum)) results.set(presNum, []);
        results.get(presNum).push({
          title: conflict,
          description: `Military engagement (${years})`,
          date,
          source: 'Wikipedia'
        });
      }
    }
  });

  return results;
}

// ------------------------------
// MERGE LOGIC
// ------------------------------

function mergeForeignData(baseMap, treatiesMap, aidMap, conflictsMap) {
  const merged = new Map();

  for (const [presNum, record] of baseMap.entries()) {
    merged.set(presNum, {
      ...record,
      treatiesNegotiated: 0,
      foreignAidPrograms: 0,
      militaryActions: 0,
      majorForeignPolicyEvents: []
    });
  }

  for (const [presNum, events] of treatiesMap.entries()) {
    const rec = merged.get(presNum);
    rec.treatiesNegotiated = events.length;
    rec.majorForeignPolicyEvents.push(...events);
  }

  for (const [presNum, events] of aidMap.entries()) {
    const rec = merged.get(presNum);
    rec.foreignAidPrograms = events.length;
    rec.majorForeignPolicyEvents.push(...events);
  }

  for (const [presNum, events] of conflictsMap.entries()) {
    const rec = merged.get(presNum);
    rec.militaryActions = events.length;
    rec.majorForeignPolicyEvents.push(...events);
  }

  return merged;
}

// ------------------------------
// MAIN
// ------------------------------

async function main() {
  console.log('Loading bootstrap + foreign policy JSON...');
  const bootstrap = loadJson(BOOTSTRAP_PATH);
  const foreignData = loadJson(FOREIGN_PATH);

  const foreignByNumber = indexByPresidentNumber(foreignData);
  const termMap = buildPresidentTermMap(bootstrap);

  console.log('Fetching State Department treaties...');
  const treatiesHtml = await fetchHtml(STATE_TREATIES_URL);
  const treatiesMap = parseStateTreaties(treatiesHtml, termMap);

  console.log('Fetching USAID foreign aid data...');
  const aidJson = await fetchJson(USAID_AID_URL);
  const aidMap = parseUSAIDAid(aidJson, termMap);

  console.log('Fetching Wikipedia military conflicts...');
  const conflictsHtml = await fetchHtml(WIKI_CONFLICTS_URL);
  const conflictsMap = parseWikipediaConflicts(conflictsHtml, termMap);

  console.log('Merging foreign policy data...');
  const merged = mergeForeignData(
    foreignByNumber,
    treatiesMap,
    aidMap,
    conflictsMap
  );

  const outArray = Array.from(merged.values()).sort(
    (a, b) => a.presidentNumber - b.presidentNumber
  );

  saveJson(FOREIGN_PATH, outArray);

  console.log('Updated presidents-foreign-policy.json with real foreign policy data.');
}

if (require.main === module) {
  main().catch(err => {
    console.error('Error in scrape-presidents-foreign-policy:', err);
    process.exit(1);
  });
}
