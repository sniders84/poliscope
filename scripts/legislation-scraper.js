// scripts/legislation-scraper.js
//
// Scrapes sponsored and cosponsored bills for the 119th Congress
// using the Congress.gov API. Outputs legislation-senators.json.

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const API_KEY = process.env.CONGRESS_API_KEY;
const BASE_URL = 'https://api.congress.gov/v3';

const legislators = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../public/legislators-current.json'), 'utf-8')
);

const outputPath = path.join(__dirname, '../public/legislation-senators.json');

// Helper: fetch all pages of results
async function fetchAllPages(url) {
  let results = [];
  let page = 1;
  while (true) {
    const resp = await axios.get(url, {
      params: { api_key: API_KEY, format: 'json', page },
    });
    const data = resp.data;
    if (!data.bills || data.bills.length === 0) break;
    results = results.concat(data.bills);
    if (!data.pagination || page >= data.pagination.count) break;
    page++;
  }
  return results;
}

// Fetch sponsored bills for a member
async function fetchSponsored(bioguideId) {
  const url = `${BASE_URL}/bill/119?sponsorId=${bioguideId}`;
  const bills = await fetchAllPages(url);
  return bills.length;
}

// Fetch cosponsored bills for a member
async function fetchCosponsored(bioguideId) {
  const url = `${BASE_URL}/bill/119?cosponsorId=${bioguideId}`;
  const bills = await fetchAllPages(url);
  return bills.length;
}

(async () => {
  const results = [];

  for (const leg of legislators) {
    const bioguideId = leg.id?.bioguide;
    if (!bioguideId) continue;

    try {
      const sponsored = await fetchSponsored(bioguideId);
      const cosponsored = await fetchCosponsored(bioguideId);

      results.push({
        bioguideId,
        name: `${leg.name.first} ${leg.name.last}`,
        state: leg.terms?.[leg.terms.length - 1]?.state || '',
        party: leg.terms?.[leg.terms.length - 1]?.party || '',
        sponsored,
        cosponsored
        // becameLaw will be added later
      });

      console.log(`${bioguideId}: sponsored=${sponsored}, cosponsored=${cosponsored}`);
    } catch (err) {
      console.error(`Error for ${bioguideId}: ${err.message}`);
    }
  }

  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`Wrote ${results.length} senator records to ${outputPath}`);
})();
