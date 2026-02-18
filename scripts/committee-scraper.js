// scripts/committee-scraper.js
// Purpose: Scrape current committee memberships for Senate (119th Congress) using Congress.gov API
// Output: public/senators-committees.json (object format for merge-senators.js)
// Run: node scripts/committee-scraper.js senate

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const API_KEY = process.env.CONGRESS_API_KEY;
const BASE_URL = 'https://api.congress.gov/v3';

const chamberArg = (process.argv[2] || 'senate').toLowerCase();
const isSenate = chamberArg === 'senate' || chamberArg === 's';
if (!isSenate) {
  console.error('This script is for Senate only. Run with "senate" argument.');
  process.exit(1);
}

const OUTPUT_PATH = path.join(__dirname, '..', 'public', 'senators-committees.json');

async function getWithRetry(url, params = {}, tries = 3) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      const fullParams = { api_key: API_KEY, format: 'json', ...params };
      const resp = await axios.get(url, { params: fullParams });
      return resp.data;
    } catch (err) {
      lastErr = err;
      console.warn(`Retry ${i+1}/${tries} for ${url}: ${err.message}`);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
  throw lastErr || new Error(`Failed after retries: ${url}`);
}

async function fetchSenateCommittees() {
  const committees = {};

  // Get list of Senate committees
  const listResp = await getWithRetry(`${BASE_URL}/committee`, {
    congress: 119,
    chamber: 'Senate',
    limit: 250
  });

  const committeeList = listResp.committees || [];
  console.log(`Found ${committeeList.length} Senate committees`);

  for (const comm of committeeList) {
    const code = comm.systemCode || comm.code;
    if (!code) continue;

    const name = comm.name || 'Unknown Committee';

    // Get members of this committee
    const memResp = await getWithRetry(`${BASE_URL}/committee/119/Senate/${code}/members`, {
      limit: 250
    });

    const members = memResp.members || [];
    if (members.length === 0) continue;

    committees[code] = {
      name,
      members: members.map(m => ({
        bioguide: m.bioguideId,
        name: m.name,
        party: m.partyName || m.party,
        rank: m.rank || null,
        title: m.title || null  // Chair, Ranking Member, etc.
      }))
    };

    console.log(`Processed committee ${code} (${name}): ${members.length} members`);
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(committees, null, 2));
  console.log(`Wrote Senate committees to ${OUTPUT_PATH} (${Object.keys(committees).length} committees)`);
}

fetchSenateCommittees().catch(err => {
  console.error('Senate committee scraper failed:', err.message);
  process.exit(1);
});
