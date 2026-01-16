// scripts/bootstrap-reps.js
// Purpose: Bootstrap representatives-rankings.json with all House members in the 119th Congress

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const OUT_PATH = path.join(__dirname, '..', 'public', 'representatives-rankings.json');
const API_KEY = process.env.CONGRESS_API_KEY;
const BASE = 'https://api.congress.gov/v3';
const CONGRESS = 119;

(async function main() {
  if (!API_KEY) {
    console.error('Missing CONGRESS_API_KEY');
    process.exit(1);
  }

  const url = `${BASE}/member/congress/${CONGRESS}?api_key=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch members: ${res.status}`);
  const data = await res.json();

  const reps = (data.members || []).filter(m => m.chamber === 'House').map(m => ({
    name: m.fullName,
    bioguideId: m.bioguideId,
    state: m.state,
    district: m.district,
    party: m.party,
    sponsoredBills: 0,
    cosponsoredBills: 0,
    sponsoredAmendments: 0,
    cosponsoredAmendments: 0,
    becameLawBills: 0,
    becameLawAmendments: 0,
    becameLawCosponsoredAmendments: 0,
    committees: [],
    yeaVotes: 0,
    nayVotes: 0,
    missedVotes: 0,
    totalVotes: 0,
    participationPct: 0,
    missedVotePct: 0,
    rawScore: 0,
    score: 0,
    scoreNormalized: 0
  }));

  fs.writeFileSync(OUT_PATH, JSON.stringify(reps, null, 2));
  console.log(`Bootstrapped representatives-rankings.json with ${reps.length} House members for Congress ${CONGRESS}`);
})();
