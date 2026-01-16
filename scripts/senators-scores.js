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

  // Find the maximum raw legislative score to normalize properly
  const maxLegScore = Math.max(...rankings.map(s => {
    return (
      (s.sponsoredBills || 0) * 20 +
      (s.cosponsoredBills || 0) * 3 +
      (s.becameLawBills || 0) * 100 +
      (s.sponsoredAmendments || 0) * 10 +
      (s.becameLawAmendments || 0) * 50
    );
  }), 1); // avoid division by zero

  rankings.forEach(sen => {
    // Ensure vote fields are valid numbers
    const yea = Number(sen.yeaVotes) || 0;
    const nay = Number(sen.nayVotes) || 0;
    const missed = Number(sen.missedVotes) || 0;
    const total = Number(sen.totalVotes) || 0;

    sen.yeaVotes = yea;
    sen.nayVotes = nay;
    sen.missedVotes = missed;
    sen.totalVotes = total;

    // Votes cast cannot exceed total possible (safety clamp)
    const votesCast = Math.min(yea + nay, total);

    // Participation percentage (capped at 100%)
    sen.participationPct = total > 0 
      ? Math.min(100, +((votesCast / total) * 100).toFixed(2)) 
      : 0;

    // Missed vote percentage
    sen.missedVotePct = total > 0 
      ? +((missed / total) * 100).toFixed(2) 
      : 0;

    // Calculate legislative component (adjust weights to taste)
    const legScore = 
      (sen.sponsoredBills || 0) * 20 +
      (sen.cosponsoredBills || 0) * 3 +
      (sen.becameLawBills || 0) * 100 +
      (sen.sponsoredAmendments || 0) * 10 +
      (sen.cosponsoredAmendments || 0) * 2 +
      (sen.becameLawAmendments || 0) * 50;

    // Voting participation bonus: 0–100 points
    const voteBonus = sen.participationPct;

    // Total raw score
    sen.rawScore = legScore + voteBonus;

    // Normalize to 0–100 scale based on highest raw score in the dataset
    sen.scoreNormalized = maxLegScore > 0 
      ? +((sen.rawScore / maxLegScore) * 100).toFixed(2) 
      : 0;

    // Log every senator's score (useful for debugging)
    console.log(
      `Scored ${sen.name}: ` +
      `raw ${sen.rawScore.toFixed(2)}, ` +
      `normalized ${sen.scoreNormalized} | ` +
      `Participation: ${sen.participationPct}%, ` +
      `Missed: ${sen.missedVotePct}%`
    );
  });

  // Extra verification logging for key senators
  const keySenators = ['Ted Cruz', 'Angela Alsobrooks', 'Ben Ray Luján', 'Peter Welch', 'Jeanne Shaheen'];
  keySenators.forEach(name => {
    const sen = rankings.find(s => s.name === name);
    if (sen) {
      console.log(
        `Final check - ${name}: ` +
        `yea=${sen.yeaVotes}, nay=${sen.nayVotes}, missed=${sen.missedVotes}, ` +
        `total=${sen.totalVotes}, part=${sen.participationPct}%, ` +
        `raw=${sen.rawScore.toFixed(2)}, norm=${sen.scoreNormalized}`
      );
    } else {
      console.log(`Final check - ${name}: not found in rankings`);
    }
  });

  try {
    fs.writeFileSync(RANKINGS_PATH, JSON.stringify(rankings, null, 2));
    console.log(`Updated senators-rankings.json with scores for ${rankings.length} senators`);
    console.log('New/updated fields: yeaVotes, nayVotes, missedVotes, totalVotes, participationPct, missedVotePct, rawScore, scoreNormalized');
  } catch (err) {
    console.error('Write error:', err.message);
  }
}

main().catch(err => console.error('Scoring failed:', err.message));
