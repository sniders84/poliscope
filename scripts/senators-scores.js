const fs = require('fs');

const rankingsData = JSON.parse(fs.readFileSync('public/senators-rankings.json', 'utf8'));
const jsonPath = 'public/senators-scores.json';

// Scoring weights
const WEIGHTS = {
  sponsoredBills: 1.2,
  sponsoredAmendments: 1.0,
  cosponsoredBills: 0.6,
  cosponsoredAmendments: 0.5,
  becameLawSponsoredBills: 6.0,
  becameLawCosponsoredBills: 5.0,
  becameLawSponsoredAmendments: 4.0,
  becameLawCosponsoredAmendments: 3.0,
  committees: 4.0,
  committeeLeadership: 2.0,
  missedVotes: -0.5 // penalty per missed vote
};

// Calculate score for one senator
function calculateScore(sen) {
  const breakdown = {
    sponsoredBills: sen.sponsoredBills || 0,
    sponsoredAmendments: sen.sponsoredAmendments || 0,
    cosponsoredBills: sen.cosponsoredBills || 0,
    cosponsoredAmendments: sen.cosponsoredAmendments || 0,
    becameLawSponsoredBills: sen.becameLawSponsoredBills || 0,
    becameLawCosponsoredBills: sen.becameLawCosponsoredBills || 0,
    becameLawSponsoredAmendments: sen.becameLawSponsoredAmendments || 0,
    becameLawCosponsoredAmendments: sen.becameLawCosponsoredAmendments || 0,
    committees: (sen.committees || []).length,
    committeeLeadership: (sen.committees || []).filter(c =>
      /chair|ranking/i.test(c.role)
    ).length,
    missedVotes: sen.missedVotes || 0
  };

  const composite =
    breakdown.sponsoredBills * WEIGHTS.sponsoredBills +
    breakdown.sponsoredAmendments * WEIGHTS.sponsoredAmendments +
    breakdown.cosponsoredBills * WEIGHTS.cosponsoredBills +
    breakdown.cosponsoredAmendments * WEIGHTS.cosponsoredAmendments +
    breakdown.becameLawSponsoredBills * WEIGHTS.becameLawSponsoredBills +
    breakdown.becameLawCosponsoredBills * WEIGHTS.becameLawCosponsoredBills +
    breakdown.becameLawSponsoredAmendments * WEIGHTS.becameLawSponsoredAmendments +
    breakdown.becameLawCosponsoredAmendments * WEIGHTS.becameLawCosponsoredAmendments +
    breakdown.committees * WEIGHTS.committees +
    breakdown.committeeLeadership * WEIGHTS.committeeLeadership +
    breakdown.missedVotes * WEIGHTS.missedVotes;

  return {
    powerScore: Math.round(composite * 10) / 10,
    breakdown
  };
}

(async () => {
  const output = rankingsData.map(sen => {
    const { powerScore, breakdown } = calculateScore(sen);
    return {
      ...sen,
      powerScore,
      breakdown
    };
  });

  fs.writeFileSync(jsonPath, JSON.stringify(output, null, 2) + '\n');
  console.log('senators-scores.json fully updated with power scores!');
})();
