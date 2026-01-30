// scripts/representatives-scores.js
// Purpose: Compute scores and add vote stats to representatives-rankings.json (overwrites it)
// Amendments removed, misconduct penalty added, streak field preserved
// Uses rubric weights with committee leadership > membership

const fs = require('fs');
const path = require('path');

const rankingsPath = path.join(__dirname, '../public/representatives-rankings.json');

console.log('Starting representatives-scores.js');

let reps;
try {
  reps = JSON.parse(fs.readFileSync(rankingsPath, 'utf-8'));
  console.log(`Loaded ${reps.length} representatives`);
} catch (err) {
  console.error('Failed to read representatives-rankings.json:', err.message);
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

reps = reps.map(r => {
  let score = 0;

  // Legislation
  for (const [field, weight] of Object.entries(WEIGHTS.bills)) {
    score += (r[field] || 0) * weight;
  }

  // Committees
  for (const c of r.committees || []) {
    if (/chair/i.test(c.role)) score += WEIGHTS.committees.Chair;
    else if (/ranking/i.test(c.role)) score += WEIGHTS.committees.RankingMember;
    else score += WEIGHTS.committees.Member;
  }

  // Votes
  const missedVotes = r.missedVotes || 0;
  score += missedVotes * WEIGHTS.votes.missedVotePenalty;

  // Misconduct penalty
  const misconductCount = r.misconductCount || 0;
  if (misconductCount > 0) {
    score += misconductCount * WEIGHTS.misconduct.penaltyPerInfraction;
  }

  // Clamp to >= 0
  if (score < 0) score = 0;

  // Ensure vote stats exist
  if (!r.yeaVotes) r.yeaVotes = 0;
  if (!r.nayVotes) r.nayVotes = 0;
  if (!r.missedVotes) r.missedVotes = 0;
  if (!r.totalVotes) r.totalVotes = 0;
  if (!r.participationPct) {
    r.participationPct = r.totalVotes > 0
      ? (1 - (r.missedVotes / r.totalVotes)) * 100
      : 100;
  }
  if (!r.missedVotePct) {
    r.missedVotePct = r.totalVotes > 0
      ? (r.missedVotes / r.totalVotes) * 100
      : 0;
  }

  return {
    ...r,
    powerScore: score,
    // streak is preserved from workflow updates
    streak: r.streak || 0,
    lastUpdated: new Date().toISOString()
  };
});

fs.writeFileSync(rankingsPath, JSON.stringify(reps, null, 2));
console.log(`Updated representatives-rankings.json with rubric-based scores, vote stats, and misconduct penalties (${reps.length} records)`);
