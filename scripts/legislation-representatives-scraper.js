// scripts/legislation-representatives-scraper.js
//
// Purpose: Pull sponsored/cosponsored bills and became-law counts *only for the 119th Congress* (House)
// Source: Congress.gov API v3 — uses bioguideId directly
// Output: public/legislation-representatives.json

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const API_KEY = process.env.CONGRESS_API_KEY;
const BASE_URL = 'https://api.congress.gov/v3';

const legislatorsPath = path.join(__dirname, '../public/legislators-current.json');
const outputPath = path.join(__dirname, '../public/legislation-representatives.json');

const legislators = JSON.parse(fs.readFileSync(legislatorsPath, 'utf-8'));

// Filter to current House reps only
const houseReps = legislators.filter(leg => {
  const lastTerm = leg.terms?.[leg.terms.length - 1];
  return lastTerm && lastTerm.type === 'rep';
});

// Accept part argument (1–4)
const partArg = parseInt(process.argv[2], 10) || 1;
const sliceSize = Math.ceil(houseReps.length / 4);
const startIndex = (partArg - 1) * sliceSize;
const endIndex = startIndex + sliceSize;
const slice = houseReps.slice(startIndex, endIndex);

console.log(`Running House legislation scraper part ${partArg}: reps ${startIndex}–${endIndex - 1}`);

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
      await new Promise(r => setTimeout(r, status === 429 ? 10000 : 3000 * (i + 1)));
    }
  }
  throw lastErr || new Error(`All retries failed for ${url}`);
}

async function fetchBills(bioguideId) {
  let sponsored = 0, cosponsored = 0, becameLawSponsored = 0, becameLawCosponsored = 0;
  const limit = 250;

  const is119th = (bill) => {
    const cong = bill.congress;
    if (cong === 119 || cong === '119') return true;
    if (bill.introducedDate && bill.introducedDate >= '2025-01-03' && bill.introducedDate < '2027-01-01') return true;
    return false;
  };

  const isBecameLaw = (bill) => {
    const action = (bill.latestAction?.action || '').toLowerCase();
    const text = (bill.latestAction?.text || '').toLowerCase();
    return /became (public )?law/.test(action) || /became (public )?law/.test(text) ||
           /signed by president/.test(text) || /enacted/.test(action) ||
           /public law no/i.test(text);
  };

  async function paginate(endpoint) {
    let count = 0;
    let lawCount = 0;
    let offset = 0;

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
      await new Promise(r => setTimeout(r, 600));
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

  for (const leg of slice) {
    const lastTerm = leg.terms?.[leg.terms.length - 1];
    const bioguideId = leg.id?.bioguide;
    if (!bioguideId) continue;

    const name = `${leg.name.first} ${leg.name.last}`;
    const state = lastTerm.state || '';
    const district = lastTerm.district || '';
    const party
