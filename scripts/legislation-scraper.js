// scripts/legislation-scraper.js
//
// Purpose: Pull sponsored/cosponsored bills and became-law counts for the 119th Congress
// Source: Congress.gov API
// Output: public/legislation-senators.json

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const API_KEY = process.env.CONGRESS_API_KEY;
const BASE_URL = 'https://api.congress.gov/v3';

const legislatorsPath = path.join(__dirname, '../public/legislators-current.json');
const outputPath = path.join(__dirname, '../public/legislation-senators.json');

const legislators = JSON.parse(fs.readFileSync(legislatorsPath, 'utf-8'));

async function fetchBills(url) {
  let sponsored = 0, cosponsored = 0, becameLawSponsored = 0, becameLawCosponsored = 0;
  let next = url;

  while (next) {
    const resp = await axios.get(next, { params: { api_key: API_KEY, format: 'json' } });
    const data = resp.data;
    if (!data.bills) break;

    for (const bill of data.bills) {
      if (bill.sponsors && bill.sponsors.some(s => s.isOriginal)) {
        sponsored++;
        if (bill.latestAction?.action?.toLowerCase().includes('became law')) {
          becameLawSponsored++;
        }
      } else {
        cosponsored++;
        if (bill.latestAction?.action?.toLowerCase().includes('became law')) {
          becameLawCosponsored++;
        }
      }
    }
    next = data.pagination?.next;
  }

  return { sponsored, cosponsored, becameLawSponsored, becameLawCosponsored };
}

(async () => {
  const results = [];

  for (const leg of legislators) {
    const bioguideId = leg.id?.bioguide;
    if (!bioguideId) continue;

    const name = `${leg.name.first} ${leg.name.last}`;
    const state = leg.terms?.[leg.terms.length - 1]?.state || '';
    const party = leg.terms?.[leg.terms.length - 1]?.party || '';

    try {
      const url = `${BASE_URL}/member/${bioguideId}/sponsored-legislation?congress=119`;
      const totals = await fetchBills(url);

      results.push({
        bioguideId,
        name,
        state,
        party,
        sponsored: totals.sponsored,
        cosponsored: totals.cosponsored,
        becameLawSponsored: totals.becameLawSponsored,
        becameLawCosponsored: totals.becameLawCosponsored,
      });

      console.log(
        `${name}: sponsored=${totals.sponsored}, cosponsored=${totals.cosponsored}, ` +
        `becameLawSponsored=${totals.becameLawSponsored}, becameLawCosponsored=${totals.becameLawCosponsored}`
      );
    } catch (err) {
      console.error(`Error for ${bioguideId} (${name}): ${err.message}`);
    }
  }

  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`Wrote ${results.length} senator records to ${outputPath}`);
})();
