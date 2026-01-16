// scripts/senators-scores.js
// Purpose: Compute composite scores for Senators based on 119th Congress data
// Enriches senators-rankings.json directly with rawScore, score, and scoreNormalized

const fs = require('fs');
const path = require('path');

const RANKINGS_PATH = path.join(__dirname, '../public/senators-rankings.json');

async function main() {
  console.log('Scoring senators based on legislation + votes');

  let rankings;
  try {
    rankings = JSON.parse(fs.readFileSync(RANKINGS_PATH, 'utf8'));
  } catch (err) {
    console.error('Failed to load senators-rankings.json:', err.message);
    return;
  }

  // Compute raw scores for each senator
  rankings.forEach(sen => {
    const yea = Number(sen.yeaVotes) || 0;
    const nay = Number(sen.nayVotes) || 0;
    const missed = Number(sen.missedVotes) || 0;
    const total = Number(sen.totalVotes) || 0;

    sen.yeaVotes = yea;
    sen.nayVotes = nay;
    sen.missedVotes = missed;
    sen.totalVotes = total;

    const votesCast = Math.min(yea + nay, total);

    sen.participationPct = total > 0
      ? Math.min(100, +((votesCast / total) * 100).toFixed(2))
      : 0;

    sen.missedVotePct = total > 0
      ? +((missed / total) * 100).toFixed(2)
      : 0;

    // Legislative component (weights adjustable)
    const legScore =
      (sen.sponsoredBills || 0) * 20 +
      (sen.cosponsoredBills || 0) * 3 +
      (sen.becameLawBills || 0) * 100 +
      (sen.becameLawCosponsoredBills || 0) * 50 +              // added
      (sen.sponsoredAmendments || 0) * 10 +
      (sen.cosponsoredAmendments || 0) * 2 +
      (sen.becameLawAmendments || 0) * 50 +
      (sen.becameLawCosponsoredAmendments || 0) * 25;          // added

    const voteBonus = sen.participationPct;

    sen.rawScore = legScore + voteBonus;
    sen.score = sen.rawScore; // keep a direct score field
  });

  // Normalize to 0–100 scale based on highest raw score in the dataset
  const maxScore = Math.max(...rankings.map(s => s.rawScore || 0), 1);
  rankings.forEach(sen => {
    sen.scoreNormalized = +((sen.rawScore / maxScore) * 100).toFixed(2);
    console.log(
      `Scored ${sen.name}: raw ${sen.rawScore.toFixed(2)}, norm ${sen.scoreNormalized} | Participation ${sen.participationPct}%, Missed ${sen.missedVotePct}%`
    );
  });

  try {
    fs.writeFileSync(RANKINGS_PATH, JSON.stringify(rankings, null, 2));
    console.log(`Updated senators-rankings.json with scores for ${rankings.length} senators`);
    console.log('New/updated fields: yeaVotes, nayVotes, missedVotes, totalVotes, participationPct, missedVotePct, rawScore, score, scoreNormalized');
  } catch (err) {
    console.error('Write error:', err.message);
  }
}

main().catch(err => console.error('Scoring failed:', err.message));
