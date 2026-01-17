// scripts/senators-scores.js
// Purpose: Compute composite scores for Senators based on 119th Congress data
// Enriches senators-rankings.json directly with rawScore, score, and scoreNormalized

const fs = require('fs');
const path = require('path');

const OUT_PATH = path.join(__dirname, '../public/senators-rankings.json');
const sens = JSON.parse(fs.readFileSync(OUT_PATH, 'utf-8'));

function computeScore(sen) {
  // Weighting factors — adjust as needed
  const billWeight = 2;
  const cosponsorWeight = 1;
  const amendmentWeight = 1;
  const voteWeight = 1;
  const committeeMembershipWeight = 2;
  const rankingBonus = 2;
  const chairBonus = 4;

  let score = 0;

  // Legislation
  score += (sen.sponsoredBills || 0) * billWeight;
  score += (sen.cosponsoredBills || 0) * cosponsorWeight;
  score += (sen.sponsoredAmendments || 0) * amendmentWeight;
  score += (sen.cosponsoredAmendments || 0) * amendmentWeight;
  score += (sen.becameLawBills || 0) * billWeight;

  // Votes
  score += (sen.yeaVotes || 0) * voteWeight;
  score += (sen.nayVotes || 0) * voteWeight;
  score -= (sen.missedVotes || 0) * 0.5; // penalty for missed votes

  // Committees
  if (Array.isArray(sen.committees)) {
    for (const c of sen.committees) {
      score += committeeMembershipWeight;
      if (c.role === 'Ranking Member') score += rankingBonus;
      if (c.role === 'Chair' || c.role === 'Chairman') score += chairBonus;
    }
  }

  return score;
}

(function main() {
  // Compute raw scores
  for (const s of sens) {
    s.rawScore = computeScore(s);
    s.score = s.rawScore;
  }

  // Normalize scores 0–100
  const maxScore = Math.max(...sens.map(s => s.score || 0));
  for (const s of sens) {
    s.scoreNormalized = maxScore > 0 ? Number(((s.score / maxScore) * 100).toFixed(2)) : 0;
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(sens, null, 2));
  console.log(`Scoring complete for Senators (${sens.length} entries)`);
})();
