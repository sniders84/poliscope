// scripts/scrape-presidents-economic-policy.js
// Purpose: Scrape real economic data from BEA, BLS, and FRED
// Updates public/presidents-economic-policy.json with real economic metrics

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

// REAL DATA SOURCES
const BEA_GDP_URL =
  'https://api.bea.gov/api/data?UserID=YOUR_BEA_API_KEY&datasetname=NIPA&TableName=T10101&Year=ALL&ResultFormat=JSON';

const BLS_UNEMPLOYMENT_URL =
  'https://api.bls.gov/publicAPI/v2/timeseries/data/LNS14000000';

const FRED_CPI_URL =
  'https://api.stlouisfed.org/fred/series/observations?series_id=CPIAUCSL&api_key=YOUR_FRED_API_KEY&file_type=json';

const PUBLIC_DIR = path.join(process.cwd(), 'public');
const BOOTSTRAP_PATH = path.join(PUBLIC_DIR, 'presidents-bootstrap.json');
const ECON_PATH = path.join(PUBLIC_DIR, 'presidents-economic-policy.json');

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

function buildPresidentTermMap(bootstrap) {
  const map = new Map();
  for (const pres of bootstrap) {
    map.set(pres.presidentNumber, {
      start: pres.termStart ? Number(pres.termStart.slice(0, 4)) : null,
      end: pres.termEnd ? Number(pres.termEnd.slice(0, 4)) : null
    });
  }
  return map;
}

// ------------------------------
// PARSERS
// ------------------------------

function parseBEAGdp(json, termMap) {
  const results = new Map();

  const rows = json?.BEAAPI?.Results?.Data || [];
  rows.forEach(row => {
    const year = Number(row.Year);
    const gdp = Number(row.DataValue);

    if (Number.isNaN(year) || Number.isNaN(gdp)) return;

    for (const [presNum, term] of termMap.entries()) {
      if (term.start && term.end && year >= term.start && year <= term.end) {
        if (!results.has(presNum)) results.set(presNum, []);
        results.get(presNum).push({ year, gdp });
      }
    }
  });

  return results;
}

function parseBLSUnemployment(json, termMap) {
  const results = new Map();

  const series = json?.Results?.series?.[0]?.data || [];
  series.forEach(entry => {
    const year = Number(entry.year);
    const value = Number(entry.value);

    if (Number.isNaN(year) || Number.isNaN(value)) return;

    for (const [presNum, term] of termMap.entries()) {
      if (term.start && term.end && year >= term.start && year <= term.end) {
        if (!results.has(presNum)) results.set(presNum, []);
        results.get(presNum).push({ year, unemployment: value });
      }
    }
  });

  return results;
}

function parseFREDInflation(json, termMap) {
  const results = new Map();

  const obs = json?.observations || [];
  obs.forEach(o => {
    const year = Number(o.date.slice(0, 4));
    const value = Number(o.value);

    if (Number.isNaN(year) || Number.isNaN(value)) return;

    for (const [presNum, term] of termMap.entries()) {
      if (term.start && term.end && year >= term.start && year <= term.end) {
        if (!results.has(presNum)) results.set(presNum, []);
        results.get(presNum).push({ year, inflation: value });
      }
    }
  });

  return results;
}

// ------------------------------
// MERGE LOGIC
// ------------------------------

function mergeEconomicData(baseMap, gdpMap, unempMap, inflMap) {
  const merged = new Map();

  for (const [presNum, record] of baseMap.entries()) {
    merged.set(presNum, {
      ...record,
      gdpGrowth: 0,
      unemploymentRate: 0,
      inflationRate: 0,
      majorEconomicEvents: []
    });
  }

  for (const [presNum, entries] of gdpMap.entries()) {
    const rec = merged.get(presNum);
    const avg = entries.reduce((s, e) => s + e.gdp, 0) / entries.length;
    rec.gdpGrowth = Number(avg.toFixed(2));
    rec.majorEconomicEvents.push(...entries.map(e => ({
      title: `GDP ${e.year}`,
      description: `GDP value: ${e.gdp}`,
      source: 'BEA'
    })));
  }

  for (const [presNum, entries] of unempMap.entries()) {
    const rec = merged.get(presNum);
    const avg = entries.reduce((s, e) => s + e.unemployment, 0) / entries.length;
    rec.unemploymentRate = Number(avg.toFixed(2));
    rec.majorEconomicEvents.push(...entries.map(e => ({
      title: `Unemployment ${e.year}`,
      description: `Unemployment rate: ${e.unemployment}%`,
      source: 'BLS'
    })));
  }

  for (const [presNum, entries] of inflMap.entries()) {
    const rec = merged.get(presNum);
    const avg = entries.reduce((s, e) => s + e.inflation, 0) / entries.length;
    rec.inflationRate = Number(avg.toFixed(2));
    rec.majorEconomicEvents.push(...entries.map(e => ({
      title: `Inflation ${e.year}`,
      description: `CPI value: ${e.inflation}`,
      source: 'FRED'
    })));
  }

  return merged;
}

// ------------------------------
// MAIN
// ------------------------------

async function main() {
  console.log('Loading bootstrap + economic JSON...');
  const bootstrap = loadJson(BOOTSTRAP_PATH);
  const econData = loadJson(ECON_PATH);

  const econByNumber = indexByPresidentNumber(econData);
  const termMap = buildPresidentTermMap(bootstrap);

  console.log('Fetching BEA GDP data...');
  const gdpJson = await fetchJson(BEA_GDP_URL);
  const gdpMap = parseBEAGdp(gdpJson, termMap);

  console.log('Fetching BLS unemployment data...');
  const unempJson = await fetchJson(BLS_UNEMPLOYMENT_URL);
  const unempMap = parseBLSUnemployment(unempJson, termMap);

  console.log('Fetching FRED CPI data...');
  const inflJson = await fetchJson(FRED_CPI_URL);
  const inflMap = parseFREDInflation(inflJson, termMap);

  console.log('Merging economic data...');
  const merged = mergeEconomicData(econByNumber, gdpMap, unempMap, inflMap);

  const outArray = Array.from(merged.values()).sort(
    (a, b) => a.presidentNumber - b.presidentNumber
  );

  saveJson(ECON_PATH, outArray);

  console.log('Updated presidents-economic-policy.json with real economic data.');
}

if (require.main === module) {
  main().catch(err => {
    console.error('Error in scrape-presidents-economic-policy:', err);
    process.exit(1);
  });
}
