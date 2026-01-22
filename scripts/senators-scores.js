// scripts/senators-scores.js
// Purpose: Compute scores and add vote stats to senators-rankings.json (overwrites it)
// Amendments removed, misconduct penalty added, streak field preserved

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
    sponsoredBills: 2,
    cosponsoredBills: 1,
    becameLawBills: 5,
    becameLawCosponsoredBills: 3
  },
  votes: {
    participationBonus: 2,      // per 100 votes cast
    penaltyMissedPct: -10       // subtract if missed > 10%
  },
  committees: {
    Chair: 5,
    RankingMember: 4,
    Member: 1
  },
  misconduct: {
    penaltyPerInfraction: -10   // subtract 10 points per misconductCount
  }
};

senators = senators.map(s => {
  let score = 0;

  // Legislation
  for (const [field, weight] of Object.entries(WEIGHTS.bills)) {
    score += (s[field] || 0) * weight;
  }

  // Committees
  for (const c of s.committees || []) {
    if (c.role === 'Chair') score += WEIGHTS.committees.Chair;
    else if (c.role === 'Ranking Member') score += WEIGHTS.committees.RankingMember;
    else score += WEIGHTS.committees.Member;
  }

  // Votes
  const totalVotes = s.totalVotes || 0;
  const missedPct = s.missedVotePct || 0;
  if (totalVotes > 0) {
    score += Math.floor(totalVotes / 100) * WEIGHTS.votes.participationBonus;
  }
  if (missedPct > 10) {
    score += WEIGHTS.votes.penaltyMissedPct;
  }

  // Misconduct penalty
  const misconductCount = s.misconductCount || 0;
  if (misconductCount > 0) {
    score += misconductCount * WEIGHTS.misconduct.penaltyPerInfraction;
  }

  // Ensure vote stats exist
  if (!s.yeaVotes) s.yeaVotes = 0;
  if (!s.nayVotes) s.nayVotes = 0;
  if (!s.missedVotes) s.missedVotes = 0;
  if (!s.totalVotes) s.totalVotes = 0;
  if (!s.participationPct) s.participationPct = totalVotes > 0 ? (1 - missedPct / 100) * 100 : 100;
  if (!s.missedVotePct) s.missedVotePct = missedPct;

  return {
    ...s,
    powerScore: score,
    // streak is preserved from workflow updates
    streak: s.streak || 0,
    lastUpdated: new Date().toISOString()
  };
});

fs.writeFileSync(rankingsPath, JSON.stringify(senators, null, 2));
console.log(`Updated senators-rankings.json with scores, vote stats, and misconduct penalties (${senators.length} records)`);
