// scripts/merge-reps.js
// Purpose: Enforce schema consistency for representatives-rankings.json (119th Congress)
// All scrapers now enrich representatives-rankings.json directly, so this step validates and normalizes

const fs = require('fs');
const path = require('path');

const OUT_PATH = path.join(__dirname, '..', 'public', 'representatives-rankings.json');

function normalize(rep) {
  return {
    name: rep.name || '',
    bioguideId: rep.bioguideId || '',
    state: rep.state || '',
    district: rep.district || '',
    party: rep.party || '',
    office: rep.office || 'Representative',
    sponsoredBills: rep.sponsoredBills || 0,
    cosponsoredBills: rep.cosponsoredBills || 0,
    sponsoredAmendments: rep.sponsoredAmendments || 0,
    cosponsoredAmendments: rep.cosponsoredAmendments || 0,
    becameLawBills: rep.becameLawBills || 0,
    becameLawAmendments: rep.becameLawAmendments || 0,
    becameLawCosponsoredAmendments: rep.becameLawCosponsoredAmendments || 0,
    committees: Array.isArray(rep.committees) ? rep.committees : [],
    yeaVotes: rep.yeaVotes || 0,
    nayVotes: rep.nayVotes || 0,
    missedVotes: rep.missedVotes || 0,
    totalVotes: rep.totalVotes || 0,
    participationPct: rep.participationPct || 0,
    missedVotePct: rep.missedVotePct || 0,
    rawScore: rep.rawScore || 0,
    score: rep.score || 0,
    scoreNormalized: rep.scoreNormalized || 0
  };
}

(function main() {
  if (!fs.existsSync(OUT_PATH)) {
    console.error('representatives-rankings.json not found. Run bootstrap first.');
    process.exit(1);
  }

  const reps = JSON.parse(fs.readFileSync(OUT_PATH, 'utf-8'));
  const normalized = reps.map(normalize);

  fs.writeFileSync(OUT_PATH, JSON.stringify(normalized, null, 2));
  console.log(`Merge complete: ${normalized.length} representatives normalized and schema enforced for Congress ${119}`);
})();
