// scripts/legislation-representatives-scraper.js
//
// Purpose: Pull sponsored/cosponsored bills and became-law counts for the 119th Congress (House)
// Source: Congress.gov API v3 — uses bioguideId directly in /member/{bioguideId}/sponsored-legislation etc.
// Output: public/legislation-representatives.json
// Note: Direct member/{bioguideId} paths for sub-endpoints; avoids buggy search.

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const API_KEY = process.env.CONGRESS_API_KEY;
const BASE_URL = 'https://api.congress.gov/v3';

const legislatorsPath = path.join(__dirname, '../public/legislators-current.json');
const outputPath = path.join(__dirname, '../public/legislation-representatives.json');

const legislators = JSON.parse(fs.readFileSync(legislatorsPath, 'utf-8'));

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
      console.warn(`Retry ${i+1}/${tries} for ${url} (status: ${status}): ${err.message}`);
      if (status === 429) await new Promise(r => setTimeout(r, 5000 * (i + 1))); // longer for rate limit
      else await new Promise(r => setTimeout(r, 2000 * (i + 1)));
    }
  }
  throw lastErr || new Error(`Failed after ${tries} tries: ${url}`);
}

async function fetchBills(bioguideId) {
  let sponsored = 0, cosponsored = 0, becameLawSponsored = 0, becameLawCosponsored = 0;
  const limit = 250;
  const congress = 119;

  const checkBecameLaw = (bill) => {
    const action = (bill.latestAction?.action || '').toLowerCase();
    const text = (bill.latestAction?.text || bill.summary?.text || '').toLowerCase();
    return action.includes('became law') || action.includes('became public law') ||
           text.includes('became public law') || text.includes('signed by president') ||
           text.includes('public law no') || action.includes('enacted');
  };

  // Sponsored bills
  let offset = 0;
  while (true) {
    const url = `${BASE_URL}/member/${bioguideId}/sponsored-legislation`;
    const params = { congress, limit, offset };
    let data;
    try {
      data = await getWithRetry(url, params);
    } catch (err) {
      console.error(`Sponsored fetch error for ${bioguideId} at offset ${offset}: ${err.message}`);
      break;
    }

    const bills = data.sponsoredLegislation || [];
    if (bills.length === 0) break;

    for (const bill of bills) {
      sponsored++;
      if (checkBecameLaw(bill)) becameLawSponsored++;
    }
    offset += limit;
    await new Promise(r => setTimeout(r, 500)); // small intra-pagination delay
  }

  // Cosponsored bills
  offset = 0;
  while (true) {
    const url = `${BASE_URL}/member/${bioguideId}/cosponsored-legislation`;
    const params = { congress, limit, offset };
    let data;
    try {
      data = await getWithRetry(url, params);
    } catch (err) {
      console.error(`Cosponsored fetch error for ${bioguideId} at offset ${offset}: ${err.message}`);
      break;
    }

    const bills = data.cosponsoredLegislation || [];
    if (bills.length === 0) break;

    for (const bill of bills) {
      cosponsored++;
      if (checkBecameLaw(bill)) becameLawCosponsored++;
    }
    offset += limit;
    await new Promise(r => setTimeout(r, 500));
  }

  return { sponsored, cosponsored, becameLawSponsored, becameLawCosponsored };
}

(async () => {
  const results = [];

  // Optional: test small slice first → uncomment to limit
  // const testLegs = legislators.slice(0, 5);
  // for (const leg of testLegs) {
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
      // Optional: quick member detail check (for debug; can remove)
      const memberUrl = `${BASE_URL}/member/${bioguideId}`;
      const memberData = await getWithRetry(memberUrl);
      console.log(`Member detail snippet for ${bioguideId}:`, JSON.stringify(memberData.member || memberData, null, 2).slice(0, 400));

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
        `becameLawSponsored=${totals.becameLawSponsored}, becameLawCosponsored=${totals.becameLawCosponsored}`
      );
    } catch (err) {
      console.error(`Error processing ${bioguideId} (${name}): ${err.message}`);
    }

    await new Promise(r => setTimeout(r, 2500)); // rate limit safety
  }

  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\nDone! Wrote ${results.length} representative records to ${outputPath}`);
})();
