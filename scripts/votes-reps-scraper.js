// scripts/votes-reps-scraper.js
// House votes scraper using xml2js (no @xmldom/xmldom)

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const xml2js = require('xml2js');

const OUT_PATH = path.join(__dirname, '..', 'public', 'representatives-rankings.json');

// Adjust year and max roll calls as needed
const YEAR = new Date().getFullYear();
const BASE_URL = `https://clerk.house.gov/evs/${YEAR}/`;
const MAX_ROLL = 500; // upper bound; script will skip missing files

function ensureRepShape(rep) {
  return {
    name: rep.name,
    bioguideId: rep.bioguideId,
    state: rep.state,
    party: rep.party,
    office: rep.office || 'Representative',
    sponsoredBills: rep.sponsoredBills || 0,
    cosponsoredBills: rep.cosponsoredBills || 0,
    sponsoredAmendments: rep.sponsoredAmendments || 0,
    cosponsoredAmendments: rep.cosponsoredAmendments || 0,
    yeaVotes: rep.yeaVotes || 0,
    nayVotes: rep.nayVotes || 0,
    missedVotes: rep.missedVotes || 0,
    totalVotes: rep.totalVotes || 0,
    committees: Array.isArray(rep.committees) ? rep.committees : [],
    participationPct: rep.participationPct || 0,
    missedVotePct: rep.missedVotePct || 0,
    rawScore: rep.rawScore || 0,
    scoreNormalized: rep.scoreNormalized || 0
  };
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
  for (let i = 1; i <= MAX_ROLL; i++) {
    const doc = await fetchRollCall(i);
    if (!doc) continue;

    // Clerk XML structure: rollcall_vote > vote_data[0] > recorded_vote[]
    const votes = doc?.rollcall_vote?.vote_data?.[0]?.recorded_vote || [];
    for (const v of votes) {
      const legislator = v.legislator?.[0]?.$ || {};
      const bioguideId = legislator.bioGuideID;
      const choice = v.vote?.[0];

      if (!bioguideId || !repMap.has(bioguideId)) continue;
      const rep = repMap.get(bioguideId);

      rep.totalVotes++;
      if (choice === 'Yea') rep.yeaVotes++;
      else if (choice === 'Nay') rep.nayVotes++;
      else rep.missedVotes++;
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
  console.log(`House votes updated: ${processed} roll calls processed`);
})().catch(err => {
  console.error('House votes scraper failed:', err);
  process.exit(1);
});
