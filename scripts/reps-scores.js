// scripts/reps-scores.js
// Compute raw + normalized scores for House representatives
// Uses legislation counts, votes, and committee leadership weight

const fs = require('fs');
const path = require('path');

const RANKINGS_PATH = path.join(__dirname, '../public/representatives-rankings.json');

function scoreHouse() {
  let reps;
  try {
    reps = JSON.parse(fs.readFileSync(RANKINGS_PATH, 'utf8'));
  } catch (err) {
    console.error('Failed to load representatives-rankings.json:', err.message);
    return;
  }

  // Compute raw scores
  reps.forEach(r => {
    const legisPoints = (r.sponsoredBills || 0) + (r.cosponsoredBills || 0);
    const lawPoints = (r.becameLawBills || 0) + (r.becameLawCosponsoredBills || 0);
    const votePoints = parseFloat(r.participationPct) || 0;
    const committeePoints = (r.committees || []).filter(c => /Chair|Ranking/.test(c.role)).length * 10;

    r.rawScore = legisPoints + lawPoints + votePoints + committeePoints;
  });

  // Normalize scores across all representatives
  const maxRaw = Math.max(...reps.map(r => r.rawScore));
  reps.forEach(r => {
    r.score = r.rawScore;
    r.scoreNormalized = maxRaw > 0 ? ((r.rawScore / maxRaw) * 100).toFixed(2) : 0;
  });

  fs.writeFileSync(RANKINGS_PATH, JSON.stringify(reps, null, 2));
  console.log(`Scoring complete for House representatives (${reps.length} entries)`);
}

scoreHouse();
