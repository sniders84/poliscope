const fs = require('fs');
const path = require('path');

const RANKINGS_PATH = path.join(__dirname, '../public/representatives-rankings.json');

async function main() {
  console.log('Scoring representatives based on legislation + votes');

  let rankings;
  try {
    rankings = JSON.parse(fs.readFileSync(RANKINGS_PATH, 'utf8'));
  } catch (err) {
    console.error('Failed to load representatives-rankings.json:', err.message);
    return;
  }

  // Find the maximum raw legislative score to normalize properly
  const maxLegScore = Math.max(
    ...rankings.map(r => {
      return (
        (r.sponsoredBills || 0) * 20 +
        (r.cosponsoredBills || 0) * 3 +
        (r.becameLawBills || 0) * 100 +
        (r.sponsoredAmendments || 0) * 10 +
        (r.becameLawAmendments || 0) * 50
      );
    }),
    1 // avoid division by zero
  );

  rankings.forEach(rep => {
    // Ensure vote fields are valid numbers
    const yea = Number(rep.yeaVotes) || 0;
    const nay = Number(rep.nayVotes) || 0;
    const missed = Number(rep.missedVotes) || 0;
    const total = Number(rep.totalVotes) || 0;

    rep.yeaVotes = yea;
    rep.nayVotes = nay;
    rep.missedVotes = missed;
    rep.totalVotes = total;

    // Votes cast cannot exceed total possible (safety clamp)
    const votesCast = Math.min(yea + nay, total);

    // Participation percentage (capped at 100%)
    rep.participationPct =
      total > 0 ? Math.min(100, +((votesCast / total) * 100).toFixed(2)) : 0;

    // Missed vote percentage
    rep.missedVotePct =
      total > 0 ? +((missed / total) * 100).toFixed(2) : 0;

    // Calculate legislative component (adjust weights to taste)
    const legScore =
      (rep.sponsoredBills || 0) * 20 +
      (rep.cosponsoredBills || 0) * 3 +
      (rep.becameLawBills || 0) * 100 +
      (rep.sponsoredAmendments || 0) * 10 +
      (rep.cosponsoredAmendments || 0) * 2 +
      (rep.becameLawAmendments || 0) * 50;

    // Voting participation bonus: 0–100 points
    const voteBonus = rep.participationPct;

    // Total raw score
    rep.rawScore = legScore + voteBonus;

    // Normalize to 0–100 scale based on highest raw score in the dataset
    rep.scoreNormalized =
      maxLegScore > 0
        ? +((rep.rawScore / maxLegScore) * 100).toFixed(2)
        : 0;

    // Log every representative's score (useful for debugging)
    console.log(
      `Scored ${rep.name}: ` +
        `raw ${rep.rawScore.toFixed(2)}, ` +
        `normalized ${rep.scoreNormalized} | ` +
        `Participation: ${rep.participationPct}%, ` +
        `Missed: ${rep.missedVotePct}%`
    );
  });

  // Extra verification logging for key representatives
  const keyReps = ['Hakeem Jeffries', 'Kevin McCarthy', 'Nancy Pelosi', 'Jim Jordan', 'Steny Hoyer'];
  keyReps.forEach(name => {
    const rep = rankings.find(r => r.name === name);
    if (rep) {
      console.log(
        `Final check - ${name}: ` +
          `yea=${rep.yeaVotes}, nay=${rep.nayVotes}, missed=${rep.missedVotes}, ` +
          `total=${rep.totalVotes}, part=${rep.participationPct}%, ` +
          `raw=${rep.rawScore.toFixed(2)}, norm=${rep.scoreNormalized}`
      );
    } else {
      console.log(`Final check - ${name}: not found in rankings`);
    }
  });

  try {
    fs.writeFileSync(RANKINGS_PATH, JSON.stringify(rankings, null, 2));
    console.log(`Updated representatives-rankings.json with scores for ${rankings.length} representatives`);
    console.log(
      'New/updated fields: yeaVotes, nayVotes, missedVotes, totalVotes, participationPct, missedVotePct, rawScore, scoreNormalized'
    );
  } catch (err) {
    console.error('Write error:', err.message);
  }
}

main().catch(err => console.error('Scoring failed:', err.message));
