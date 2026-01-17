// scripts/house-votes-scraper.js
// Purpose: Fetch Clerk XML roll calls and update representatives-rankings.json with vote tallies

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const xml2js = require('xml2js');

const OUT_PATH = path.join(__dirname, '..', 'public', 'representatives-rankings.json');
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
  const reps = JSON.parse(fs.readFileSync(OUT_PATH, 'utf-8'));
  const repMap = new Map(reps.map(r => [r.bioguideId, r]));

  let processed = 0;

  for (let i = 1; i <= MAX_ROLL; i++) {
    const doc = await fetchRollCall(i);
    if (!doc) continue;

    const votes = doc?.rollcall_vote?.vote_data?.[0]?.recorded_vote || [];
    for (const v of votes) {
      const legislator = v.legislator?.[0]?.$ || {};
      const bioguideId = legislator.bioGuideID;
      const choice = v.vote?.[0];

      if (!bioguideId || !repMap.has(bioguideId)) continue;
      const rep = repMap.get(bioguideId);

      rep.totalVotes = (rep.totalVotes || 0) + 1;
      if (choice === 'Yea') rep.yeaVotes = (rep.yeaVotes || 0) + 1;
      else if (choice === 'Nay') rep.nayVotes = (rep.nayVotes || 0) + 1;
      else rep.missedVotes = (rep.missedVotes || 0) + 1;
    }
    processed++;
  }

  // Calculate participation percentages
  for (const rep of reps) {
    if (rep.totalVotes > 0) {
      rep.participationPct = (
        ((rep.yeaVotes + rep.nayVotes) / rep.totalVotes) * 100
      ).toFixed(2);
      rep.missedVotePct = (
        (rep.missedVotes / rep.totalVotes) * 100
      ).toFixed(2);
    } else {
      rep.participationPct = 0;
      rep.missedVotePct = 0;
    }
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(reps, null, 2));
  console.log(`House votes updated in representatives-rankings.json for ${repMap.size} reps, ${processed} roll calls processed`);
})().catch(err => {
  console.error('House votes scraper failed:', err);
  process.exit(1);
});
