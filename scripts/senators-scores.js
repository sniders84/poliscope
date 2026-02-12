// scripts/senators-scores.js
// Purpose: Compute rubric-based scores for senators and overwrite senators-rankings.json
// Schema preserved exactly as before. Uses aggregated vote totals from senators-votes.json.

const fs = require('fs');
const path = require('path');

const rankingsPath = path.join(__dirname, '../public/senators-rankings.json');

console.log('Starting senators-scores.js');

let senators;
try {
  senators = JSON.parse(fs.readFileSync(rankingsPath, 'utf-8'));
  console.log(`Loaded ${senators.length} senators`);
} catch (err) {
  console.error('Failed to read senators-rankings.json:', err.message);
  process.exit(1);
}

const WEIGHTS = {
  bills: {
    sponsoredBills: 1.2,
    cosponsoredBills: 0.6,
    becameLawBills: 6.0,
    becameLawCosponsoredBills: 3.0
  },
  committees: {
    Chair: 4.0,
    RankingMember: 4.0,
    Member: 2.0
  },
  votes: {
    missedVotePenalty: -0.5
  },
  misconduct: {
    penaltyPerInfraction: -10.0
  }
};

senators = senators.map(s => {
  let score = 0;

  // --- LEGISLATION ---
  for (const [field, weight] of Object.entries(WEIGHTS.bills)) {
    score += (s[field] || 0) * weight;
  }

  // --- COMMITTEES ---
  for (const c of s.committees || []) {
    if (/chair/i.test(c.role)) score += WEIGHTS.committees.Chair;
    else if (/ranking/i.test(c.role)) score += WEIGHTS.committees.RankingMember;
    else score += WEIGHTS.committees.Member;
  }

  // --- VOTES ---
  // Your new scraper provides complete totals, so this is now accurate.
  const missedVotes = s.missedVotes || 0;
  score += missedVotes * WEIGHTS.votes.missedVotePenalty;

  // --- MISCONDUCT ---
  const misconductCount = s.misconductCount || 0;
  score += misconductCount * WEIGHTS.misconduct.penaltyPerInfraction;

  // No negative scores
  if (score < 0) score = 0;

  return {
    ...s,
    powerScore: score,
    streak: s.streak || 0, // preserve streak
    lastUpdated: new Date().toISOString()
  };
});

fs.writeFileSync(rankingsPath, JSON.stringify(senators, null, 2));
console.log(`Updated senators-rankings.json with rubric-based scores (${senators.length} records)`);
