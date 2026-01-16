// scripts/senators-scores.js
// Purpose: Compute scores for Senators, including new became-law cosponsor fields

const fs = require('fs');
const path = require('path');

const OUT_PATH = path.join(__dirname, '..', 'public', 'senators-rankings.json');

(function main() {
  const sens = JSON.parse(fs.readFileSync(OUT_PATH, 'utf-8'));

  for (const s of sens) {
    const legis =
      (s.sponsoredBills + s.cosponsoredBills) +
      (s.sponsoredAmendments + s.cosponsoredAmendments);

    const laws =
      (s.becameLawBills + s.becameLawCosponsoredBills) +
      (s.becameLawAmendments + s.becameLawCosponsoredAmendments);

    const votes = (s.yeaVotes + s.nayVotes);

    // Simple raw score: weight laws higher, include participation
    s.rawScore = legis + (laws * 3) + Math.round((s.participationPct || 0) / 10) + votes;

    s.score = s.rawScore;
  }

  // Normalize 0–100
  const max = sens.reduce((m, s) => Math.max(m, s.score), 0) || 1;
  for (const s of sens) {
    s.scoreNormalized = Number(((s.score / max) * 100).toFixed(2));
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(sens, null, 2));
  console.log(`Scoring complete for Senators (${sens.length} entries)`);
})();
