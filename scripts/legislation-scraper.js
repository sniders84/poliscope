/**
 * Legislation scraper (Senate-only, Congress.gov API)
 * - Uses /member endpoint to pull sponsored and cosponsored legislation
 * - Aggregates counts per senator
 * - Outputs public/senators-legislation.json
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = process.env.CONGRESS_API_KEY;
const CONGRESS = process.env.CONGRESS_NUMBER || '119';
const OUT_PATH = path.join('public', 'senators-legislation.json');

if (!API_KEY) throw new Error('Missing CONGRESS_API_KEY env.');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function getJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function fetchAllPages(baseUrl) {
  const results = [];
  let page = 1;
  while (true) {
    const url = `${baseUrl}&page=${page}`;
    const json = await getJson(url);
    const items = json?.data || [];
    results.push(...items);
    if (page >= (json?.pagination?.pages || 1)) break;
    page++;
    await sleep(200);
  }
  return results;
}

function initTotals() {
  return {
    sponsored: 0,
    cosponsored: 0
  };
}

async function run() {
  console.log(`Legislation scraper: Congress=${CONGRESS}, chamber=Senate`);
  const senators = await fetchAllPages(
    `https://api.congress.gov/v3/member?format=json&chamber=Senate&congress=${CONGRESS}&api_key=${API_KEY}`
  );

  const totals = new Map();

  for (const s of senators) {
    const id = s.bioguideId;
    if (!id) continue;
    if (!totals.has(id)) totals.set(id, initTotals());

    const sponsored = await fetchAllPages(
      `https://api.congress.gov/v3/member/${id}/sponsored-legislation?format=json&congress=${CONGRESS}&api_key=${API_KEY}`
    );
    const cosponsored = await fetchAllPages(
      `https://api.congress.gov/v3/member/${id}/cosponsored-legislation?format=json&congress=${CONGRESS}&api_key=${API_KEY}`
    );

    const t = totals.get(id);
    t.sponsored += sponsored.length;
    t.cosponsored += cosponsored.length;
  }

  const results = Array.from(totals.entries()).map(([id, t]) => ({ bioguideId: id, ...t }));
  fs.writeFileSync(OUT_PATH, JSON.stringify(results, null, 2));
  console.log(`Wrote ${OUT_PATH} with ${results.length} senator entries.`);
}

run().catch(e => { console.error('Legislation scraper failed:', e); process.exit(1); });
