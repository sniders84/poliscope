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

  const maxRaw = Math.max(...rankings.map(s => s.rawScore || 0), 1); // avoid division by zero

  rankings.forEach(sen => {
    // Ensure vote fields are numbers
    const yea = Number(sen.yeaVotes) || 0;
    const nay = Number(sen.nayVotes) || 0;
    const missed = Number(sen.missedVotes) || 0;
    const total = Number(sen.totalVotes) || 0;

    sen.yeaVotes = yea;
    sen.nayVotes = nay;
    sen.missedVotes = missed;
    sen.totalVotes = total;

    // Participation: votes cast / total possible votes
    sen.participationPct = total > 0 
      ? Math.min(100, +(((yea + nay) / total) * 100).toFixed(2)) 
      : 0;

    sen.missedVotePct = total > 0 
      ? +((missed / total) * 100).toFixed(2) 
      : 0;

    // Example raw score calculation (adjust weights as needed)
    // This is just a placeholder — replace with your actual scoring logic
    const legScore = (sen.sponsoredBills || 0) * 10 +
                     (sen.cosponsoredBills || 0) * 2 +
                     (sen.becameLawBills || 0) * 50 +
                     (sen.sponsoredAmendments || 0) * 5 +
                     (sen.cosponsoredAmendments || 0) * 1 +
                     (sen.becameLawAmendments || 0) * 30;

    // Add voting participation bonus (up to 100 points)
    const voteBonus = sen.participationPct * 1;

    sen.rawScore = legScore + voteBonus;
    sen.scoreNormalized = maxRaw > 0 ? +((sen.rawScore / maxRaw) * 100).toFixed(2) : 0;

    console.log(`Scored ${sen.name}: raw ${sen.rawScore.toFixed(2)}, normalized ${sen.scoreNormalized} | Participation: ${sen.participationPct}%, Missed: ${sen.missedVotePct}%`);
  });

  // Log a few examples to verify
  ['Ted Cruz', 'Angela Alsobrooks', 'Ben Ray Luján', 'Peter Welch'].forEach(name => {
    const sen = rankings.find(s => s.name === name);
    if (sen) {
      console.log(`Final - ${name}: yea=${sen.yeaVotes}, nay=${sen.nayVotes}, missed=${sen.missedVotes}, total=${sen.totalVotes}, part=${sen.participationPct}%`);
    }
  });

  try {
    fs.writeFileSync(RANKINGS_PATH, JSON.stringify(rankings, null, 2));
    console.log('Updated senators-rankings.json with scores for ' + rankings.length + ' senators');
    console.log('New fields added/used: yeaVotes, nayVotes, missedVotes, totalVotes, participationPct, rawScore, scoreNormalized');
  } catch (err) {
    console.error('Write error:', err.message);
  }
}

main().catch(err => console.error('Scoring failed:', err.message));
