// scripts/legislation-representatives-scraper.js
//
// Purpose: Pull sponsored/cosponsored bills and became-law counts for the 119th Congress (House)
// Source: Congress.gov API v3 — uses bioguideId directly in /member/{bioguideId}/sponsored-legislation etc.
// Output: public/legislation-representatives.json

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
      console.warn(`Retry ${i+1}/${tries} for ${url} (params: ${JSON.stringify(params)}) - status ${status}: ${err.message}`);
      await new Promise(r => setTimeout(r, status === 429 ? 10000 : 3000 * (i + 1))); // longer for rate limits
    }
  }
  throw lastErr || new Error(`All retries failed for ${url}`);
}

async function fetchBills(bioguideId) {
  let sponsored = 0, cosponsored = 0, becameLawSponsored = 0, becameLawCosponsored = 0;
  const limit = 250;
  const congress = 119;

  const isBecameLaw = (bill) => {
    const action = (bill.latestAction?.action || '').toLowerCase();
    const text = (bill.latestAction?.text || '').toLowerCase();
    return /became (public )?law/.test(action) || /became (public )?law/.test(text) ||
           /signed by president/.test(text) || /enacted/.test(action) ||
           /public law no/i.test(text);
  };

  // Helper to paginate one endpoint
  async function paginate(endpoint) {
    let count = 0;
    let lawCount = 0;
    let offset = 0;
    while (true) {
      const url = `${BASE_URL}/member/${bioguideId}/${endpoint}`;
      const params = { congress, limit, offset };
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
        count++;
        if (isBecameLaw(bill)) lawCount++;
      }

      offset += limit;
      await new Promise(r => setTimeout(r, 600)); // gentle intra-page delay
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
      // Quick verification fetch (optional; comment out if too verbose/slow)
      const memberUrl = `${BASE_URL}/member/${bioguideId}`;
      const memberData = await getWithRetry(memberUrl, {});
      const snippet = JSON.stringify(memberData.member || memberData, null, 2).slice(0, 400);
      console.log(`Member detail snippet: ${snippet}`);

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
      console.error(`Error for ${bioguideId} (${name}): ${err.message}`);
    }

    await new Promise(r => setTimeout(r, 3000)); // 3s between members
  }

  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\nWrote ${results.length} records to ${outputPath}`);
})();
