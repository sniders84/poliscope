// scripts/merge-reps.js
// Purpose: Consolidate and enforce schema for representatives-rankings.json

const fs = require('fs');
const path = require('path');

const OUT_PATH = path.join(__dirname, '..', 'public', 'representatives-rankings.json');

function ensureShape(r) {
  return {
    bioguideId: r.bioguideId,
    name: r.name,
    state: r.state,
    district: r.district || 'At-Large',
    party: r.party,
    office: 'Representative',
    sponsoredBills: r.sponsoredBills || 0,
    cosponsoredBills: r.cosponsoredBills || 0,
    becameLawBills: r.becameLawBills || 0,
    becameLawCosponsoredBills: r.becameLawCosponsoredBills || 0,
    sponsoredAmendments: r.sponsoredAmendments || 0,
    cosponsoredAmendments: r.cosponsoredAmendments || 0,
    becameLawAmendments: r.becameLawAmendments || 0,
    becameLawCosponsoredAmendments: r.becameLawCosponsoredAmendments || 0,
    committees: Array.isArray(r.committees) ? r.committees : [],
    yeaVotes: r.yeaVotes || 0,
    nayVotes: r.nayVotes || 0,
    missedVotes: r.missedVotes || 0,
    totalVotes: r.totalVotes || 0,
    participationPct: r.participationPct || 0,
    missedVotePct: r.missedVotePct || 0,
    rawScore: r.rawScore || 0,
    score: r.score || 0,
    scoreNormalized: r.scoreNormalized || 0
  };
}

(function main() {
  const reps = JSON.parse(fs.readFileSync(OUT_PATH, 'utf-8'));
  const map = new Map();
  for (const r of reps) {
    map.set(r.bioguideId, ensureShape(r));
  }
  const merged = Array.from(map.values());
  fs.writeFileSync(OUT_PATH, JSON.stringify(merged, null, 2));
  console.log('Merge complete: representatives normalized and schema enforced');
})();
