// scripts/merge-senators.js
// Purpose: Consolidate and enforce schema for senators-rankings.json

const fs = require('fs');
const path = require('path');

const OUT_PATH = path.join(__dirname, '..', 'public', 'senators-rankings.json');

function ensureShape(s) {
  return {
    bioguideId: s.bioguideId,
    name: s.name,
    state: s.state,
    district: s.district || 'At-Large',
    party: s.party,
    office: 'Senator',
    sponsoredBills: s.sponsoredBills || 0,
    cosponsoredBills: s.cosponsoredBills || 0,
    becameLawBills: s.becameLawBills || 0,
    becameLawCosponsoredBills: s.becameLawCosponsoredBills || 0,
    sponsoredAmendments: s.sponsoredAmendments || 0,
    cosponsoredAmendments: s.cosponsoredAmendments || 0,
    becameLawAmendments: s.becameLawAmendments || 0,
    becameLawCosponsoredAmendments: s.becameLawCosponsoredAmendments || 0,
    committees: Array.isArray(s.committees) ? s.committees : [],
    yeaVotes: s.yeaVotes || 0,
    nayVotes: s.nayVotes || 0,
    missedVotes: s.missedVotes || 0,
    totalVotes: s.totalVotes || 0,
    participationPct: s.participationPct || 0,
    missedVotePct: s.missedVotePct || 0,
    rawScore: s.rawScore || 0,
    score: s.score || 0,
    scoreNormalized: s.scoreNormalized || 0
  };
}

(function main() {
  console.log('Merge script: consolidating into senators-rankings.json');
  const sens = JSON.parse(fs.readFileSync(OUT_PATH, 'utf-8'));
  const map = new Map();
  for (const s of sens) {
    map.set(s.bioguideId, ensureShape(s));
  }
  const merged = Array.from(map.values());
  console.log(`After deduplication: ${merged.length} senators`);
  fs.writeFileSync(OUT_PATH, JSON.stringify(merged, null, 2));
  console.log('Merge complete: senators normalized and schema enforced');
})();
