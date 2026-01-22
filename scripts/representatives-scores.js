// scripts/representatives-scores.js
// Purpose: Compute scores and add vote stats to representatives-rankings.json (overwrites it)
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
  }
};

reps = reps.map(r => {
  let score = 0;

  // Legislation (bills only)
  for (const [field, weight] of Object.entries(WEIGHTS.bills)) {
    score += (r[field] || 0) * weight;
  }

  // Committees
  for (const c of r.committees || []) {
    if (c.role === 'Chair') score += WEIGHTS.committees.Chair;
    else if (c.role === 'Ranking Member') score += WEIGHTS.committees.RankingMember;
    else score += WEIGHTS.committees.Member;
  }

  // Votes (placeholders if missing)
  const totalVotes = r.totalVotes || 0;
  const missedPct = r.missedVotePct || 0;
  if (totalVotes > 0) {
    score += Math.floor(totalVotes / 100) * WEIGHTS.votes.participationBonus;
  }
  if (missedPct > 10) {
    score += WEIGHTS.votes.penaltyMissedPct;
  }

  // Add vote stats if missing
  if (!r.yeaVotes) r.yeaVotes = 0;
  if (!r.nayVotes) r.nayVotes = 0;
  if (!r.missedVotes) r.missedVotes = 0;
  if (!r.totalVotes) r.totalVotes = 0;
  if (!r.participationPct) r.participationPct = totalVotes > 0 ? (1 - missedPct / 100) * 100 : 100;
  if (!r.missedVotePct) r.missedVotePct = missedPct;

  return {
    ...r,
    powerScore: score,
    lastUpdated: new Date().toISOString()
  };
});

fs.writeFileSync(rankingsPath, JSON.stringify(reps, null, 2));
console.log(`Updated representatives-rankings.json with scores and vote stats (${reps.length} records)`);
