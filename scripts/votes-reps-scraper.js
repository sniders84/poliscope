// scripts/votes-reps-scraper.js
// House votes scraper using xml2js

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const xml2js = require('xml2js');

const OUT_PATH = path.join(__dirname, '..', 'public', 'representatives-rankings.json');
const YEAR = 2025; // lock to current Congress year
const BASE_URL = `https://clerk.house.gov/evs/${YEAR}/`;
const MAX_ROLL = 500;

function ensureRepShape(rep) {
  rep.yeaVotes = rep.yeaVotes || 0;
  rep.nayVotes = rep.nayVotes || 0;
  rep.missedVotes = rep.missedVotes || 0;
  rep.totalVotes = rep.totalVotes || 0;
  rep.participationPct = rep.participationPct || 0;
  rep.missedVotePct = rep.missedVotePct || 0;
  return rep;
}

function indexByBioguide(list) {
  const map = new Map();
  for (const r of list) {
    if (r.bioguideId) map.set(r.bioguideId, r);
  }
  return map;
}

async function fetchRollCall(num) {
  const url = `${BASE_URL}roll${String(num).padStart(3, '0')}.xml`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const xml = await res.text();
  return xml2js.parseStringPromise(xml);
}

(async function main() {
  const reps = JSON.parse(fs.readFileSync(OUT_PATH, 'utf-8')).map(ensureRepShape);
  const repMap = indexByBioguide(reps);

  let processed = 0;
  let attached = 0;

  for (let i = 1; i <= MAX_ROLL; i++) {
    const doc = await fetchRollCall(i);
    if (!doc) continue;

    const votes = doc?.rollcall_vote?.vote_data?.[0]?.recorded_vote || [];
    for (const v of votes) {
      const legislator = v.legislator?.[0]?.$ || {};
      const bioguideId = legislator.bioGuideID || legislator.name_id;
      const choice = v.vote?.[0];

      if (!bioguideId || !repMap.has(bioguideId)) continue;
      const rep = repMap.get(bioguideId);

      rep.totalVotes++;
      if (choice === 'Yea') rep.yeaVotes++;
      else if (choice === 'Nay') rep.nayVotes++;
      else rep.missedVotes++;
      attached++;
    }
    processed++;
  }

  for (const r of reps) {
    if (r.totalVotes > 0) {
      const participated = r.yeaVotes + r.nayVotes;
      r.participationPct = Number(((participated / r.totalVotes) * 100).toFixed(2));
      r.missedVotePct = Number(((r.missedVotes / r.totalVotes) * 100).toFixed(2));
    }
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(reps, null, 2));
  console.log(`House votes updated: ${processed} roll calls processed; ${attached} member-votes attached`);
})().catch(err => {
  console.error('House votes scraper failed:', err);
  process.exit(1);
});
