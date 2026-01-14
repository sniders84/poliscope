/**
 * Committee scraper (Congress.gov API v3)
 * - Fetches Senate committees via path-form endpoint
 * - Outputs public/senators-committees.json
 */

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const OUT_PATH = path.join('public', 'senators-committees.json');
const API_KEY = process.env.CONGRESS_API_KEY;
const CONGRESS = process.env.CONGRESS_NUMBER || '119';

async function run() {
  console.log(`Committee scraper: Congress=${CONGRESS}, chamber=Senate`);

  const url = `https://api.congress.gov/v3/committee/${CONGRESS}/Senate`;
  const res = await fetch(url, { headers: { 'X-API-Key': API_KEY } });
  if (!res.ok) throw new Error(`Failed ${url}: ${res.status}`);
  const data = await res.json();

  const committees = data.committees || [];
  const results = [];

  for (const c of committees) {
    const members = c.members || [];
    for (const m of members) {
      results.push({
        bioguideId: m.bioguideId,
        committees: [{ committee: c.name, role: m.role || 'Member' }]
      });
    }
  }

  if (results.length === 0) {
    console.log("No data, skipping write.");
    return;
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(results, null, 2));
  console.log(`Wrote ${OUT_PATH} with ${results.length} senator entries.`);
}

run().catch(err => { console.error(err); process.exit(1); });
