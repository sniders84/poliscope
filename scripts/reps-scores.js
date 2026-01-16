// scripts/reps-scores.js
// Purpose: Compute scores for House representatives, including new became-law cosponsor fields

const fs = require('fs');
const path = require('path');

const OUT_PATH = path.join(__dirname, '..', 'public', 'representatives-rankings.json');

(function main() {
  const reps = JSON.parse(fs.readFileSync(OUT_PATH, 'utf-8'));

  for (const r of reps) {
    const legis =
      (r.sponsoredBills + r.cosponsoredBills) +
      (r.sponsoredAmendments + r.cosponsoredAmendments);

    const laws =
      (r.becameLawBills + r.becameLawCosponsoredBills) +
      (r.becameLawAmendments + r.becameLawCosponsoredAmendments);

    const votes = (r.yeaVotes + r.nayVotes);

    r.rawScore = legis + (laws * 3) + Math.round((r.participationPct || 0) / 10) + votes;
    r.score = r.rawScore;
  }

  const max = reps.reduce((m, r) => Math.max(m, r.score), 0) || 1;
  for (const r of reps) {
    r.scoreNormalized = Number(((r.score / max) * 100).toFixed(2));
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(reps, null, 2));
  console.log(`Scoring complete for House representatives (${reps.length} entries)`);
})();
