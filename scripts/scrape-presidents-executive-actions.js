// scripts/scrape-presidents-executive-actions.js
// Purpose: Scrape real executive actions from the Federal Register API
// Updates public/presidents-executive-actions.json with real data

const fs = require('fs');
const path = require('path');

// REAL DATA SOURCE
// Federal Register API: https://www.federalregister.gov/developers/api/v1
// Example endpoint for executive orders:
// https://www.federalregister.gov/api/v1/documents.json?conditions[presidential_document_type]=executive_order

const FEDREG_API =
  'https://www.federalregister.gov/api/v1/documents.json?per_page=1000&conditions[presidential_document_type]=executive_order';

const PUBLIC_DIR = path.join(process.cwd(), 'public');
const BOOTSTRAP_PATH = path.join(PUBLIC_DIR, 'presidents-bootstrap.json');
const EXEC_PATH = path.join(PUBLIC_DIR, 'presidents-executive-actions.json');

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

function actionBelongsToPresident(date, term) {
  if (!term.start || !term.end) return false;
  const d = new Date(date);
  return d >= term.start && d <= term.end;
}

function parseFederalRegister(json, termMap) {
  const results = new Map();

  const docs = json?.results || [];
  docs.forEach(doc => {
    const date = doc.publication_date;
    const title = doc.title;
    const summary = doc.abstract || '';
    const url = doc.html_url;

    if (!date || !title) return;

    for (const [presNum, term] of termMap.entries()) {
      if (actionBelongsToPresident(date, term)) {
        if (!results.has(presNum)) results.set(presNum, []);
        results.get(presNum).push({
          title,
          description: summary,
          url,
          date,
          source: 'Federal Register'
        });
      }
    }
  });

  return results;
}

function mergeExecutiveData(baseMap, execMap) {
  const merged = new Map();

  for (const [presNum, record] of baseMap.entries()) {
    merged.set(presNum, {
      ...record,
      executiveOrders: 0,
      majorExecutiveActions: []
    });
  }

  for (const [presNum, events] of execMap.entries()) {
    const rec = merged.get(presNum);
    rec.executiveOrders = events.length;
    rec.majorExecutiveActions.push(...events);
  }

  return merged;
}

async function main() {
  console.log('Loading bootstrap + executive JSON...');
  const bootstrap = loadJson(BOOTSTRAP_PATH);
  const execData = loadJson(EXEC_PATH);

  const execByNumber = indexByPresidentNumber(execData);
  const termMap = buildPresidentTermMap(bootstrap);

  console.log('Fetching Federal Register executive orders...');
  const fedJson = await fetchJson(FEDREG_API);

  console.log('Parsing Federal Register data...');
  const execMap = parseFederalRegister(fedJson, termMap);

  console.log('Merging executive action data...');
  const merged = mergeExecutiveData(execByNumber, execMap);

  const outArray = Array.from(merged.values()).sort(
    (a, b) => a.presidentNumber - b.presidentNumber
  );

  saveJson(EXEC_PATH, outArray);

  console.log('Updated presidents-executive-actions.json with real executive order data.');
}

if (require.main === module) {
  main().catch(err => {
    console.error('Error in scrape-presidents-executive-actions:', err);
    process.exit(1);
  });
}
