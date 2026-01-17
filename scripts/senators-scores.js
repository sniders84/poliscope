// scripts/senators-scores.js
// Compute raw + normalized scores for Senators
// Uses legislation counts, votes, and committee leadership weight

const fs = require('fs');
const path = require('path');

const RANKINGS_PATH = path.join(__dirname, '../public/senators-rankings.json');

function scoreSenate() {
  let senators;
  try {
    senators = JSON.parse(fs.readFileSync(RANKINGS_PATH, 'utf8'));
  } catch (err) {
    console.error('Failed to load senators-rankings.json:', err.message);
    return;
  }

  // Compute raw scores
  senators.forEach(s => {
    const legisPoints = (s.sponsoredBills || 0) + (s.cosponsoredBills || 0);
    const lawPoints = (s.becameLawBills || 0) + (s.becameLawCosponsoredBills || 0);
    const votePoints = parseFloat(s.participationPct) || 0;
    const committeePoints = (s.committees || []).filter(c => /Chair|Ranking/.test(c.role)).length * 10;

    s.rawScore = legisPoints + lawPoints + votePoints + committeePoints;
  });

  // Normalize scores across all senators
  const maxRaw = Math.max(...senators.map(s => s.rawScore));
  senators.forEach(s => {
    s.score = s.rawScore;
    s.scoreNormalized = maxRaw > 0 ? ((s.rawScore / maxRaw) * 100).toFixed(2) : 0;
  });

  fs.writeFileSync(RANKINGS_PATH, JSON.stringify(senators, null, 2));
  console.log(`Scoring complete for Senators (${senators.length} entries)`);
}

scoreSenate();
