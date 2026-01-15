// scripts/house-votes-scraper.js
// Purpose: Fetch House roll call votes from clerk.house.gov XML and save raw JSON

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const xml2js = require('xml2js');

const OUT_PATH = path.join(__dirname, '..', 'public', 'house-votes-rollcalls.json');
const YEAR = new Date().getFullYear();
const BASE_URL = `https://clerk.house.gov/evs/${YEAR}/`;
const MAX_ROLL = 500;

async function fetchRollCall(num) {
  const url = `${BASE_URL}roll${String(num).padStart(3, '0')}.xml`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const xml = await res.text();
  return xml2js.parseStringPromise(xml);
}

(async function main() {
  const rollcalls = [];
  for (let i = 1; i <= MAX_ROLL; i++) {
    const doc = await fetchRollCall(i);
    if (!doc) continue;

    const votes = doc?.rollcall_vote?.vote_data?.[0]?.recorded_vote || [];
    rollcalls.push({
      voteId: `vote_${YEAR}_${i}`,
      members: votes.map(v => {
        const legislator = v.legislator?.[0]?.$ || {};
        return {
          bioguideId: legislator.bioGuideID,
          vote: v.vote?.[0] || 'Not Voting'
        };
      })
    });
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(rollcalls, null, 2));
  console.log(`House roll calls saved: ${rollcalls.length} files processed`);
})().catch(err => {
  console.error('House votes scraper failed:', err);
  process.exit(1);
});
