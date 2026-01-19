// scripts/legislation-representatives-scraper.js
//
// Purpose: Pull sponsored/cosponsored bills and became-law counts for the 119th Congress (House)
// Source: Congress.gov API v3 — uses bioguideId directly in member/{bioguideId}/... endpoints
// Output: public/legislation-representatives.json

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const API_KEY = process.env.CONGRESS_API_KEY;
const BASE_URL = 'https://api.congress.gov/v3';

const legislatorsPath = path.join(__dirname, '../public/legislators-current.json');
const outputPath = path.join(__dirname, '../public/legislation-representatives.json');

const legislators = JSON.parse(fs.readFileSync(legislatorsPath, 'utf-8'));

async function getWithRetry(url, params = {}, tries = 4) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      const resp = await axios.get(url, { params: { ...params, api_key: API_KEY, format: 'json' } });
      return resp.data;
    } catch (err) {
      lastErr = err;
      console.warn(`Retry ${i+1}/${tries} for ${url}: ${err.message}`);
      await new Promise(r => setTimeout(r, 1500 * (i + 1))); // exponential backoff
    }
  }
  throw lastErr;
}

async function fetchBills(bioguideId) {
  let sponsored = 0, cosponsored = 0, becameLawSponsored = 0, becameLawCosponsored = 0;

  const commonParams = { congress: 119, limit: 250 }; // max per page

  // Sponsored bills
  let next = `${BASE_URL}/member/${bioguideId}/sponsored-legislation`;
  while (next) {
    const data = await getWithRetry(next, commonParams);
    if (!data.sponsoredLegislation || !Array.isArray(data.sponsoredLegislation)) break;

    for (const bill of data.sponsoredLegislation) {
      sponsored++;
      const action = (bill.latestAction?.action || '').toLowerCase();
      const text = (bill.latestAction?.text || '').toLowerCase();
      if (action.includes('became law') || action.includes('became public law') ||
          text.includes('became public law') || text.includes('signed by president')) {
        becameLawSponsored++;
      }
    }
    next = data.pagination?.next ? `${BASE_URL}${data.pagination.next}` : null;
  }

  // Cosponsored bills
  next = `${BASE_URL}/member/${bioguideId}/cosponsored-legislation`;
  while (next) {
    const data = await getWithRetry(next, commonParams);
    if (!data.cosponsoredLegislation || !Array.isArray(data.cosponsoredLegislation)) break;

    for (const bill of data.cosponsoredLegislation) {
      cosponsored++;
      const action = (bill.latestAction?.action || '').toLowerCase();
      const text = (bill.latestAction?.text || '').toLowerCase();
      if (action.includes('became law') || action.includes('became public law') ||
          text.includes('became public law') || text.includes('signed by president')) {
        becameLawCosponsored++;
      }
    }
    next = data.pagination?.next ? `${BASE_URL}${data.pagination.next}` : null;
  }

  return { sponsored, cosponsored, becameLawSponsored, becameLawCosponsored };
}

(async () => {
  const results = [];

  for (const leg of legislators) {
    const lastTerm = leg.terms?.[leg.terms.length - 1];
    if (!lastTerm || lastTerm.type !== 'rep' || !lastTerm.start || !lastTerm.end) continue;

    const bioguideId = leg.id?.bioguide;
    if (!bioguideId) continue;

    const name = `${leg.name.first} ${leg.name.last}`;
    const state = lastTerm.state || '';
    const district = lastTerm.district || '';
    const party = lastTerm.party || '';

    console.log(`Processing ${name} (${bioguideId})...`);

    try {
      const totals = await fetchBills(bioguideId);

      results.push({
        bioguideId,
        name,
        state,
        district,
        party,
        sponsoredBills: totals.sponsored,
        cosponsoredBills: totals.cosponsored,
        becameLawBills: totals.becameLawSponsored,
        becameLawCosponsoredBills: totals.becameLawCosponsored
      });

      console.log(
        `${name}: sponsored=${totals.sponsored}, cosponsored=${totals.cosponsored}, ` +
        `becameLaw=${totals.becameLawSponsored}, becameLawCosponsored=${totals.becameLawCosponsored}`
      );

      // Gentle rate limiting: ~1 request every 1.5s on average (adjust up if you get 429s)
      await new Promise(r => setTimeout(r, 1500));
    } catch (err) {
      console.error(`Error for ${bioguideId} (${name}): ${err.message}`);
    }
  }

  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`Wrote ${results.length} representative records to ${outputPath}`);
})();
