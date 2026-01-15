// scripts/votes-reps-scraper.js
// Purpose: Fetch and parse House roll call votes from clerk.house.gov XML and merge into representatives-rankings.json

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const { DOMParser } = require('@xmldom/xmldom');

const OUT_PATH = path.join(__dirname, '..', 'public', 'representatives-rankings.json');

// Clerk House roll call base URL (adjust year as needed)
const YEAR = 2025;
const BASE_URL = `https://clerk.house.gov/evs/${YEAR}/`;

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
    scoreNormalized: rep.scoreNormalized || 0,
  };
}

function indexByBioguide(list) {
  const map = new Map();
  list.forEach(r => {
    if (r.bioguideId) map.set(r.bioguideId, r);
  });
  return map;
}

async function fetchRollCall(num) {
  const url = `${BASE_URL}roll${String(num).padStart(3, '0')}.xml`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const xml = await res.text();
  return new DOMParser().parseFromString(xml, 'text/xml');
}

(async function main() {
  const reps = JSON.parse(fs.readFileSync(OUT_PATH, 'utf-8')).map(ensureRepShape);
  const repMap = indexByBioguide(reps);

  let processed = 0;
  // Adjust upper bound to expected number of roll calls in the session
  for (let i = 1; i <= 300; i++) {
    const doc = await fetchRollCall(i);
    if (!doc) continue;

    const votes = doc.getElementsByTagName('recorded-vote');
    for (let j = 0; j < votes.length; j++) {
      const v = votes.item(j);
      const legislator = v.getElementsByTagName('legislator').item(0);
      const bioguideId = legislator?.getAttribute('bioGuideID');
      const choice = v.getElementsByTagName('vote').item(0)?.textContent;

      if (!bioguideId || !repMap.has(bioguideId)) continue;
      const rep = repMap.get(bioguideId);
      rep.totalVotes++;
      if (choice === 'Yea') rep.yeaVotes++;
      else if (choice === 'Nay') rep.nayVotes++;
      else rep.missedVotes++;
    }
    processed++;
  }

  reps.forEach(r => {
    if (r.totalVotes > 0) {
      r.participationPct = ((r.yeaVotes + r.nayVotes) / r.totalVotes * 100).toFixed(2);
      r.missedVotePct = ((r.missedVotes / r.totalVotes) * 100).toFixed(2);
    }
  });

  fs.writeFileSync(OUT_PATH, JSON.stringify(reps, null, 2));
  console.log(`House votes updated: ${processed} roll calls processed`);
})().catch(err => {
  console.error('House votes scraper failed:', err);
  process.exit(1);
});
