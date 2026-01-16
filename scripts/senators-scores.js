// scripts/senators-scores.js
// Purpose: Compute composite scores for Senators based on 119th Congress data
// Includes becameLawCosponsoredBills and becameLawCosponsoredAmendments in scoring

const fs = require('fs');
const path = require('path');

const OUT_PATH = path.join(__dirname, '..', 'public', 'senators-rankings.json');

function computeScore(sen) {
  // Example scoring weights — adjust to your model
  const billWeight = 2;
  const amendWeight = 1;
  const committeeWeight = 3;
  const voteWeight = 1;

  const rawScore =
    (sen.sponsoredBills * billWeight) +
    (sen.cosponsoredBills * billWeight) +
    (sen.becameLawBills * billWeight) +
    (sen.becameLawCosponsoredBills * billWeight) +
    (sen.sponsoredAmendments * amendWeight) +
    (sen.cosponsoredAmendments * amendWeight) +
    (sen.becameLawAmendments * amendWeight) +
    (sen.becameLawCosponsoredAmendments * amendWeight) +
    (Array.isArray(sen.committees) ? sen.committees.length * committeeWeight : 0) +
    (sen.yeaVotes * voteWeight) +
    (sen.nayVotes * voteWeight);

  return rawScore;
}

(function main() {
  const sens = JSON.parse(fs.readFileSync(OUT_PATH, 'utf-8'));

  for (const s of sens) {
    s.rawScore = computeScore(s);
    s.score = s.rawScore;
  }

  const maxScore = Math.max(...sens.map(s => s.score || 0));
  for (const s of sens) {
    s.scoreNormalized = maxScore > 0 ? Number(((s.score / maxScore) * 100).toFixed(2)) : 0;
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(sens, null, 2));
  console.log(`Scoring complete for Senators (${sens.length} entries)`);
})();
