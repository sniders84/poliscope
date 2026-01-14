/**
 * Legislation scraper (Congress.gov API v3)
 * - Fetches Senate bills & resolutions via path-form endpoints
 * - Aggregates sponsored/cosponsored counts per senator
 * - Outputs public/senators-legislation.json
 */

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const OUT_PATH = path.join('public', 'senators-legislation.json');
const API_KEY = process.env.CONGRESS_API_KEY;
const CONGRESS = process.env.CONGRESS_NUMBER || '119';
const BILL_TYPES = ['s', 'sjres', 'sconres', 'sres'];

function initTotals() { return { sponsored: 0, cosponsored: 0 }; }

function getSponsorId(bill) {
  // v3 can expose sponsor as object or array
  if (bill.sponsor?.bioguideId) return bill.sponsor.bioguideId;
  if (Array.isArray(bill.sponsors) && bill.sponsors[0]?.bioguideId) return bill.sponsors[0].bioguideId;
  return null;
}

function getCosponsorIds(bill) {
  // v3 can expose cosponsors as array or nested items
  if (Array.isArray(bill.cosponsors)) {
    return bill.cosponsors.map(c => c.bioguideId).filter(Boolean);
  }
  if (bill.cosponsors?.items && Array.isArray(bill.cosponsors.items)) {
    return bill.cosponsors.items.map(c => c.bioguideId).filter(Boolean);
  }
  return [];
}

async function fetchBills(billType) {
  let results = [];
  let offset = 0;
  const pageSize = 250;

  while (true) {
    const url = `https://api.congress.gov/v3/bill/${CONGRESS}/${billType}?pageSize=${pageSize}&offset=${offset}`;
    const res = await fetch(url, { headers: { 'X-API-Key': API_KEY } });
    if (!res.ok) throw new Error(`Failed ${url}: ${res.status}`);
    const data = await res.json();
    const chunk = data.bills || [];
    if (chunk.length === 0) break;
    results = results.concat(chunk);
    offset += pageSize;
  }
  return results;
}

async function run() {
  console.log(`Legislation scraper: Congress=${CONGRESS}, chamber=Senate`);

  const totals = new Map();

  for (const type of BILL_TYPES) {
    const bills = await fetchBills(type);
    for (const bill of bills) {
      const sponsorId = getSponsorId(bill);
      if (sponsorId) {
        if (!totals.has(sponsorId)) totals.set(sponsorId, initTotals());
        totals.get(sponsorId).sponsored++;
      }
      const cosponsorIds = getCosponsorIds(bill);
      for (const id of cosponsorIds) {
        if (!totals.has(id)) totals.set(id, initTotals());
        totals.get(id).cosponsored++;
      }
    }
  }

  const results = Array.from(totals.entries()).map(([bioguideId, t]) => ({ bioguideId, ...t }));
  if (results.length === 0) {
    console.log("No data, skipping write.");
    return;
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(results, null, 2));
  console.log(`Wrote ${OUT_PATH} with ${results.length} senator entries.`);
}

run().catch(err => { console.error(err); process.exit(1); });
