// scripts/legislation-scraper.js
//
// Purpose: Pull sponsored/cosponsored bills and became-law counts *only for the 119th Congress* (Senate)
// Source: Congress.gov API v3 — uses bioguideId directly (no memberId resolution)
// Output: public/legislation-senators.json

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const API_KEY = process.env.CONGRESS_API_KEY;
const BASE_URL = 'https://api.congress.gov/v3';

const legislatorsPath = path.join(__dirname, '../public/legislators-current.json');
const outputPath = path.join(__dirname, '../public/legislation-senators.json');

const legislators = JSON.parse(fs.readFileSync(legislatorsPath, 'utf-8'));

// Cache for bill detail requests
const billCache = new Map();

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
      console.warn(`Retry ${i+1}/${tries} for ${url} (status ${status}): ${err.message}`);
      // Exponential backoff, longer wait on 429
      const delay = status === 429 ? 60000 * (i + 1) : 3000 * (i + 1);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastErr || new Error(`All retries failed for ${url}`);
}

function is119th(bill) {
  const cong = bill.congress;
  if (cong === 119 || cong === '119') return true;
  if (bill.introducedDate && bill.introducedDate >= '2025-01-03' && bill.introducedDate < '2027-01-01') return true;
  return false;
}

function isBecameLaw(detail) {
  const action = (detail.latestAction?.action || '').toLowerCase();
  const text = (detail.latestAction?.text || '').toLowerCase();
  return /became (public )?law/.test(action) || /became (public )?law/.test(text) ||
         /signed by president/.test(text) || /enacted/.test(action) ||
         /public law no/i.test(text);
}

async function fetchBillDetail(url) {
  if (billCache.has(url)) return billCache.get(url);
  try {
    const detail = await getWithRetry(url);
    billCache.set(url, detail);
    return detail;
  } catch (err) {
    console.warn(`Failed detail fetch for ${url}: ${err.message}`);
    return null;
  }
}

async function fetchBills(bioguideId) {
  let sponsored = 0, cosponsored = 0, becameLawSponsored = 0, becameLawCosponsored = 0;
  const limit = 100; // smaller page size to reduce load
  const maxPages = 10; // cap pages per senator

  async function paginate(endpoint) {
    let count = 0;
    let lawCount = 0;
    let offset = 0;
    let totalPagesProcessed = 0;

    while (true) {
      if (totalPagesProcessed >= maxPages) break;

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
        if (!is119th(bill)) continue;
        const detail = await fetchBillDetail(bill.url);
        if (detail) {
          count++;
          if (isBecameLaw(detail)) lawCount++;
        }
      }

      offset += limit;
      totalPagesProcessed++;
      await new Promise(r => setTimeout(r, 1000)); // pacing
    }

    return { count, lawCount };
  }

  const sponsoredData = await paginate('sponsored-legislation');
  sponsored = sponsoredData.count;
  becameLawSponsored = sponsoredData.lawCount;

  const cosponsoredData = await paginate('cosponsored-legislation');
  cosponsored = cosponsoredData.count;
  becameLawCosponsored = cosponsoredData.lawCount;

  return { sponsored, cosponsored, becameLawSponsored, becameLawCosponsored };
}

(async () => {
  const results = [];
  let failedCount = 0;

  for (const leg of legislators) {
    const lastTerm = leg.terms?.[leg.terms.length - 1];
    if (!lastTerm || lastTerm.type !== 'sen') continue;  // filter to senators

    const bioguideId = leg.id?.bioguide;
    if (!bioguideId) continue;

    const name = `${leg.name.first} ${leg.name.last}`;
    const state = lastTerm.state || '';
    const party = lastTerm.party || '';

    console.log(`\nProcessing ${name} (${bioguideId}, ${state})...`);

    try {
      const totals = await fetchBills(bioguideId);

      results.push({
        bioguideId,
        name,
        state,
        party,
        sponsoredBills: totals.sponsored,
        cosponsoredBills: totals.cosponsored,
        becameLawBills: totals.becameLawSponsored,
        becameLawCosponsoredBills: totals.becameLawCosponsored,
        lastUpdated: new Date().toISOString()
      });

      console.log(`${name}: sponsored=${totals.sponsored}, cosponsored=${totals.cosponsored}, becameLawSponsored=${totals.becameLawSponsored}, becameLawCosponsored=${totals.becameLawCosponsored}`);
    } catch (err) {
      console.error(`Error for ${bioguideId} (${name}): ${err.message}`);
      failedCount++;
    }

    await new Promise(r => setTimeout(r, 2000)); // pacing between senators
  }

  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\nWrote ${results.length} senator records to ${outputPath} (failed/skipped: ${failedCount})`);
})();
