// senators-scores.js
// Computes power scores from senators-rankings.json
// Outputs public/senators-scores.json

const fs = require('fs');

// Load merged rankings
const rankings = JSON.parse(fs.readFileSync('public/senators-rankings.json', 'utf8'));

function computeScore(s) {
  // Weighting factors — adjust as needed
  const weights = {
    sponsoredBills: 1.0,
    cosponsoredBills: 0.5,
    becameLawSponsoredBills: 5.0,
    becameLawCosponsoredBills: 2.5,
    committees: 10.0,
    committeeLeadership: 20.0,
    missedVotes: -2.0,
  };

  const breakdown = {
    sponsoredBills: s.sponsoredBills,
    cosponsoredBills: s.cosponsoredBills,
    becameLawSponsoredBills: s.becameLawSponsoredBills,
    becameLawCosponsoredBills: s.becameLawCosponsoredBills,
    committees: s.committees.length,
    committeeLeadership: s.committeeLeadership.length,
    missedVotes: s.missedVotes,
  };

  let score = 0;
  for (const [key, val] of Object.entries(breakdown)) {
    score += (val || 0) * (weights[key] || 0);
  }

  return { powerScore: Number(score.toFixed(1)), breakdown };
}

async function run() {
  const results = rankings.map(s => {
    const { powerScore, breakdown } = computeScore(s);
    return {
      ...s,
      powerScore,
      breakdown,
    };
  });

  fs.writeFileSync('public/senators-scores.json', JSON.stringify(results, null, 2));
  console.log('senators-scores.json fully updated with power scores!');
}

run().catch(err => console.error(err));
