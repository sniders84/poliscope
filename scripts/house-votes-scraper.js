// scripts/house-votes-scraper.js
// Purpose: Fetch Clerk XML roll calls and output tallies to house-votes.json

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const xml2js = require('xml2js');

const OUT_PATH = path.join(__dirname, '..', 'public', 'house-votes.json');
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
  const tallies = {};
  let processed = 0;

  for (let i = 1; i <= MAX_ROLL; i++) {
    const doc = await fetchRollCall(i);
    if (!doc) continue;

    const votes = doc?.rollcall_vote?.vote_data?.[0]?.recorded_vote || [];
    for (const v of votes) {
      const legislator = v.legislator?.[0]?.$ || {};
      const bioguideId = legislator.bioGuideID;
      const choice = v.vote?.[0];

      if (!bioguideId) continue;
      if (!tallies[bioguideId]) {
        tallies[bioguideId] = { yea: 0, nay: 0, missed: 0, total: 0 };
      }

      tallies[bioguideId].total++;
      if (choice === 'Yea') tallies[bioguideId].yea++;
      else if (choice === 'Nay') tallies[bioguideId].nay++;
      else tallies[bioguideId].missed++;
    }
    processed++;
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(tallies, null, 2));
  console.log(`House votes tallies written for ${Object.keys(tallies).length} reps, ${processed} roll calls processed`);
})().catch(err => {
  console.error('House votes scraper failed:', err);
  process.exit(1);
});
