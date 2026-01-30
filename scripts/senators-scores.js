// scripts/senators-scores.js
// Purpose: Compute scores and add vote stats to senators-rankings.json (overwrites it)
// Amendments removed, misconduct penalty added, streak field preserved
// Uses rubric weights with committee leadership > membership

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
    Chair: 4.0,            // heavier weight for leadership
    RankingMember: 4.0,    // treat Ranking Member same as Chair
    Member: 2.0            // lighter weight for membership
  },
  votes: {
    missedVotePenalty: -0.5 // penalty per missed vote
  },
  misconduct: {
    penaltyPerInfraction: -10.0 // penalty per misconductCount
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
    if (/chair/i.test(c.role)) score += WEIGHTS.committees.Chair;
    else if (/ranking/i.test(c.role)) score += WEIGHTS.committees.RankingMember;
    else score += WEIGHTS.committees.Member;
  }

  // Votes
  const missedVotes = s.missedVotes || 0;
  score += missedVotes * WEIGHTS.votes.missedVotePenalty;

  // Misconduct penalty
  const misconductCount = s.misconductCount || 0;
  if (misconductCount > 0) {
    score += misconductCount * WEIGHTS.misconduct.penaltyPerInfraction;
  }

  // Clamp to >= 0
  if (score < 0) score = 0;

  // Ensure vote stats exist
  if (!s.yeaVotes) s.yeaVotes = 0;
  if (!s.nayVotes) s.nayVotes = 0;
  if (!s.missedVotes) s.missedVotes = 0;
  if (!s.totalVotes) s.totalVotes = 0;
  if (!s.participationPct) {
    s.participationPct = s.totalVotes > 0
      ? (1 - (s.missedVotes / s.totalVotes)) * 100
      : 100;
  }
  if (!s.missedVotePct) {
    s.missedVotePct = s.totalVotes > 0
      ? (s.missedVotes / s.totalVotes) * 100
      : 0;
  }

  return {
    ...s,
    powerScore: score,
    // streak is preserved from workflow updates
    streak: s.streak || 0,
    lastUpdated: new Date().toISOString()
  };
});

fs.writeFileSync(rankingsPath, JSON.stringify(senators, null, 2));
console.log(`Updated senators-rankings.json with rubric-based scores, vote stats, and misconduct penalties (${senators.length} records)`);
