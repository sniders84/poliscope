// scripts/merge-reps.js
// Purpose: Ensure representatives-rankings.json entries are complete and consistent after scrapers run

const fs = require('fs');
const path = require('path');

const OUT_PATH = path.join(__dirname, '..', 'public', 'representatives-rankings.json');

(function main() {
  const reps = JSON.parse(fs.readFileSync(OUT_PATH, 'utf-8'));

  reps.forEach(r => {
    // enforce schema completeness
    r.sponsoredBills = r.sponsoredBills || 0;
    r.sponsoredAmendments = r.sponsoredAmendments || 0;
    r.cosponsoredBills = r.cosponsoredBills || 0;
    r.cosponsoredAmendments = r.cosponsoredAmendments || 0;
    r.becameLawBills = r.becameLawBills || 0;
    r.becameLawAmendments = r.becameLawAmendments || 0;
    r.becameLawCosponsoredAmendments = r.becameLawCosponsoredAmendments || 0;
    r.committees = Array.isArray(r.committees) ? r.committees : [];
    r.yeaVotes = r.yeaVotes || 0;
    r.nayVotes = r.nayVotes || 0;
    r.missedVotes = r.missedVotes || 0;
    r.totalVotes = r.totalVotes || 0;
    r.participationPct = r.participationPct || 0;
    r.missedVotePct = r.missedVotePct || 0;
    r.rawScore = r.rawScore || 0;
    r.score = r.score || 0;
    r.scoreNormalized = r.scoreNormalized || 0;
  });

  fs.writeFileSync(OUT_PATH, JSON.stringify(reps, null, 2));
  console.log(`Merge complete: ${reps.length} representatives normalized and schema enforced`);
})();
