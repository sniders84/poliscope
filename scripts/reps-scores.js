// scripts/reps-scores.js
// Purpose: Compute composite scores for House representatives based on 119th Congress data
// Enriches representatives-rankings.json directly with rawScore, score, and scoreNormalized

const fs = require('fs');
const path = require('path');

const OUT_PATH = path.join(__dirname, '../public/representatives-rankings.json');
const reps = JSON.parse(fs.readFileSync(OUT_PATH, 'utf-8'));

function computeScore(rep) {
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
  score += (rep.sponsoredBills || 0) * billWeight;
  score += (rep.cosponsoredBills || 0) * cosponsorWeight;
  score += (rep.sponsoredAmendments || 0) * amendmentWeight;
  score += (rep.cosponsoredAmendments || 0) * amendmentWeight;
  score += (rep.becameLawBills || 0) * billWeight;

  // Votes
  score += (rep.yeaVotes || 0) * voteWeight;
  score += (rep.nayVotes || 0) * voteWeight;
  score -= (rep.missedVotes || 0) * 0.5; // penalty for missed votes

  // Committees
  if (Array.isArray(rep.committees)) {
    for (const c of rep.committees) {
      score += committeeMembershipWeight;
      if (c.role === 'Ranking Member') score += rankingBonus;
      if (c.role === 'Chair' || c.role === 'Chairman') score += chairBonus;
    }
  }

  return score;
}

(function main() {
  // Compute raw scores
  for (const r of reps) {
    r.rawScore = computeScore(r);
    r.score = r.rawScore;
  }

  // Normalize scores 0–100
  const maxScore = Math.max(...reps.map(r => r.score || 0));
  for (const r of reps) {
    r.scoreNormalized = maxScore > 0 ? Number(((r.score / maxScore) * 100).toFixed(2)) : 0;
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(reps, null, 2));
  console.log(`Scoring complete for House representatives (${reps.length} entries)`);
})();
