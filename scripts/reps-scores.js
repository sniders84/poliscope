// scripts/reps-scores.js
// Purpose: Compute composite scores for House representatives based on 119th Congress data

const fs = require('fs');
const path = require('path');

const IN_PATH  = path.join(__dirname, '..', 'public', 'representatives-rankings.json');
const OUT_PATH = path.join(__dirname, '..', 'public', 'representatives-scores.json');

function computeScore(rep) {
  // Example scoring weights — adjust to your model
  const billWeight = 2;
  const amendWeight = 1;
  const committeeWeight = 3;
  const voteWeight = 1;

  const rawScore =
    (rep.sponsoredBills * billWeight) +
    (rep.cosponsoredBills * billWeight) +
    (rep.sponsoredAmendments * amendWeight) +
    (rep.cosponsoredAmendments * amendWeight) +
    (rep.becameLawBills * billWeight) +
    (rep.becameLawAmendments * amendWeight) +
    (rep.becameLawCosponsoredAmendments * amendWeight) +
    (rep.committees.length * committeeWeight) +
    (rep.yeaVotes * voteWeight) +
    (rep.nayVotes * voteWeight);

  return rawScore;
}

(function main() {
  const reps = JSON.parse(fs.readFileSync(IN_PATH, 'utf-8'));

  // Compute raw scores
  for (const r of reps) {
    r.rawScore = computeScore(r);
    r.score = r.rawScore; // can add adjustments if needed
  }

  // Normalize scores to 0–100 scale
  const maxScore = Math.max(...reps.map(r => r.score));
  for (const r of reps) {
    r.scoreNormalized = maxScore > 0 ? Number(((r.score / maxScore) * 100).toFixed(2)) : 0;
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(reps, null, 2));
  console.log(`Scoring complete for House representatives (${reps.length} entries)`);
})();
