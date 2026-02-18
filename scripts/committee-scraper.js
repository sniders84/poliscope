// scripts/committee-scraper.js
// Purpose: Scrape current Senate committee memberships using Congress.gov API
// Output: public/senators-committees.json

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const API_KEY = process.env.CONGRESS_API_KEY;
const BASE_URL = 'https://api.congress.gov/v3';

const OUTPUT_PATH = path.join(__dirname, '..', 'public', 'senators-committees.json');

async function getWithRetry(url, params = {}, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const resp = await axios.get(url, {
        params: { api_key: API_KEY, format: 'json', ...params }
      });
      return resp.data;
    } catch (err) {
      console.warn(`Retry ${i+1}/${tries} for ${url}: ${err.response?.status || err.message}`);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
  throw new Error(`Failed after retries: ${url}`);
}

async function fetchSenateCommittees() {
  const committees = {};

  // List Senate committees
  const listResp = await getWithRetry(`${BASE_URL}/committee`, {
    congress: 119,
    chamber: 'senate',
    limit: 250
  });

  const committeeList = listResp.committees || [];
  console.log(`Found ${committeeList.length} Senate committees`);

  for (const comm of committeeList) {
    const code = comm.code || comm.systemCode;
    if (!code) continue;

    const name = comm.name || 'Unknown';

    // Get members (correct endpoint: /committee-members)
    const memResp = await getWithRetry(`${BASE_URL}/committee-members`, {
      congress: 119,
      chamber: 'senate',
      committeeCode: code,
      limit: 250
    });

    const members = memResp.committeeMembers || [];
    if (members.length === 0) continue;

    committees[code] = {
      name,
      members: members.map(m => ({
        bioguide: m.bioguideId,
        name: m.name,
        party: m.party,
        rank: m.rank,
        title: m.title || 'Member'
      }))
    };

    console.log(`Processed ${code} (${name}): ${members.length} members`);
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(committees, null, 2));
  console.log(`Wrote ${Object.keys(committees).length} Senate committees to ${OUTPUT_PATH}`);
}

fetchSenateCommittees().catch(err => {
  console.error('Failed:', err.message);
  process.exit(1);
});
