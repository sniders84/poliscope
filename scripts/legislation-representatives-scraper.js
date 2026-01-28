// scripts/legislation-representatives-scraper.js
//
// Purpose: Pull sponsored/cosponsored bills and became-law counts *only for the 119th Congress* (House)
// Optimized: Uses existing legislation-representatives.json as baseline and only fetches new pages
// Source: Congress.gov API v3 — uses bioguideId directly; filters response to congress=119
// Output: public/legislation-representatives.json

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const API_KEY = process.env.CONGRESS_API_KEY;
const BASE_URL = 'https://api.congress.gov/v3';

const legislatorsPath = path.join(__dirname, '../public/legislators-current.json');
const outputPath = path.join(__dirname, '../public/legislation-representatives.json');

const legislators = JSON.parse(fs.readFileSync(legislatorsPath, 'utf-8'));

// Load existing data if present
let existing = [];
if (fs.existsSync(outputPath)) {
  try {
    existing = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
    console.log(`Loaded existing legislation data for ${existing.length} representatives`);
  } catch {
    console.warn('Failed to parse existing legislation-representatives.json, starting fresh');
    existing = [];
  }
}
const existingMap = Object.fromEntries(existing.map(r => [r.bioguideId, r]));

async function getWithRetry(url, params = {}, tries = 5) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      const fullParams = { api_key: API_KEY, format: 'json', ...params };
      const resp = await axios.get(url, { params: fullParams });
      return resp.data;
    } catch (err) {
      lastErr = err;
      const status = err.response?.status || 'unknown';
      console.warn(`Retry ${i+1}/${tries} for ${url} - status ${status}: ${err.message}`);
      await new Promise(r => setTimeout(r, status === 429 ? 10000 : 3000 * (i + 1)));
    }
  }
  throw lastErr || new Error(`All retries failed for ${url}`);
}

function is119th(bill) {
  const cong = bill.congress;
  if (cong === 119 || cong === '119') return true;
  if (bill.introducedDate && bill.introducedDate >= '2025-01-03' && bill.introducedDate < '2027-01-01') {
    return true;
  }
  return false;
}

function isBecameLaw(bill) {
  const action = (bill.latestAction?.action || '').toLowerCase();
  const text = (bill.latestAction?.text || '').toLowerCase();
  return /became (public )?law/.test(action) || /became (public )?law/.test(text) ||
         /signed by president/.test(text) || /enacted/.test(action) ||
         /public law no/i.test(text);
}

async function fetchBills(bioguideId, prevTotals) {
  let sponsored = prevTotals?.sponsoredBills || 0;
  let cosponsored = prevTotals?.cosponsoredBills || 0;
  let becameLawSponsored = prevTotals?.becameLawBills || 0;
  let becameLawCosponsored = prevTotals?.becameLawCosponsoredBills || 0;

  const limit = 250;

  async function paginate(endpoint, prevCount) {
    let count = prevCount;
    let lawCount = endpoint === 'sponsored-legislation' ? becameLawSponsored : becameLawCosponsored;
    let offset = prevCount; // start from where we left off
    let newPages = 0;

    while (true) {
      const url = `${BASE_URL}/member/${bioguideId}/${endpoint}`;
      const params = { congress: 119, limit, offset };
      let data;
      try {
        data = await getWithRetry(url, params);
      } catch (err) {
        console.error(`Pagination error for ${endpoint} at offset ${offset}: ${err.message}`);
        break;
      }

      const billsKey = endpoint === 'sponsored-legislation' ? 'sponsoredLegislation' : 'cosponsoredLegislation';
      const bills = data[billsKey] || [];
      if (bills.length === 0) break;

      for (const bill of bills) {
        if (is119th(bill)) {
          count++;
          if (isBecameLaw(bill)) lawCount++;
        }
      }

      offset += limit;
      newPages++;
      await new Promise(r => setTimeout(r, 600));
    }

    console.log(`Processed ${newPages} new pages for ${endpoint} (new count: ${count})`);
    return { count, lawCount };
  }

  const sponsoredData = await paginate('sponsored-legislation', sponsored);
  sponsored = sponsoredData.count;
  becameLawSponsored = sponsoredData.lawCount;

  const cosponsoredData = await paginate('cosponsored-legislation', cosponsored);
  cosponsored = cosponsoredData.count;
  becameLawCosponsored = cosponsoredData.lawCount;

  return { sponsored, cosponsored, becameLawSponsored, becameLawCosponsored };
}

(async () => {
  const startTime = Date.now();
  const results = [];
  let failedCount = 0;

  for (const leg of legislators) {
    const lastTerm = leg.terms?.[leg.terms.length - 1];
    if (!lastTerm || lastTerm.type !== 'rep') continue;

    const bioguideId = leg.id?.bioguide;
    if (!bioguideId) continue;

    const name = `${leg.name.first} ${leg.name.last}`;
    const state = lastTerm.state || '';
    const district = lastTerm.district || '';
    const party = lastTerm.party || '';

    console.log(`\nProcessing ${name} (${bioguideId}, ${state}-${district})...`);

    try {
      const prevTotals = existingMap[bioguideId];
      const totals = await fetchBills(bioguideId, prevTotals);

      results.push({
        bioguideId,
        name,
        state,
        district,
        party,
        sponsoredBills: totals.sponsored,
        cosponsoredBills: totals.cosponsored,
        becameLawBills: totals.becameLawSponsored,
        becameLawCosponsoredBills: totals.becameLawCosponsored,
        lastUpdated: new Date().toISOString()
      });

      console.log(
        `${name}: sponsored=${totals.sponsored}, cosponsored=${totals.cosponsored}, ` +
        `becameLawSponsored=${totals.becameLawSponsored}, becameLawCosponsored=${totals.becameLawCosponsored}`
      );
    } catch (err) {
      console.error(`Error for ${bioguideId} (${name}): ${err.message}`);
      failedCount++;
    }

    await new Promise(r => setTimeout(r, 1500)); // shorter delay since fewer pages
  }

  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  const durationHours = ((Date.now() - startTime) / 1000 / 3600).toFixed(2);
  console.log(`\nWrote ${results.length} records to ${outputPath} (failed/skipped: ${failedCount})`);
  console.log(`Total runtime: ${durationHours} hours`);
})();
