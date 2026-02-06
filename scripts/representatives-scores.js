// scripts/representatives-scores.js
// Purpose: Compute scores and add vote stats to representatives-rankings.json
// Amendments removed, misconduct penalty added, streak preserved
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

function ensureSchema(r) {
  r.yeaVotes ??= 0;
  r.nayVotes ??= 0;
  r.missedVotes ??= 0;
  r.totalVotes ??= 0;
  r.participationPct ??= 0;
  r.missedVotePct ??= 0;

  r.sponsoredBills ??= 0;
  r.cosponsoredBills ??= 0;
  r.becameLawBills ??= 0;
  r.becameLawCosponsoredBills ??= 0;

  r.committees = Array.isArray(r.committees) ? r.committees : [];

  r.misconductCount ??= 0;
  r.rawScore ??= 0;
  r.score ??= 0;
  r.scoreNormalized ??= 0;

  return r;
}

reps = reps.map(ensureSchema);

let maxScore = 0;
reps = reps.map(r => {
  let score = 0;

  for (const [field, weight] of Object.entries(WEIGHTS.bills)) {
    score += (r[field] || 0) * weight;
  }

  for (const c of r.committees || []) {
    if (/chair/i.test(c.role)) score += WEIGHTS.committees.Chair;
    else if (/ranking/i.test(c.role)) score += WEIGHTS.committees.RankingMember;
    else score += WEIGHTS.committees.Member;
  }

  score += (r.missedVotes || 0) * WEIGHTS.votes.missedVotePenalty;

  const misconductCount = r.misconductCount || 0;
  if (misconductCount > 0) {
    score += misconductCount * WEIGHTS.misconduct.penaltyPerInfraction;
  }

  if (score < 0) score = 0;
  if (score > maxScore) maxScore = score;

  return {
    ...r,
    powerScore: score,
    streak: r.streak || 0,
    lastUpdated: new Date().toISOString()
  };
});

reps = reps.map(r => ({
  ...r,
  scoreNormalized: maxScore > 0 ? Number(((r.powerScore / maxScore) * 100).toFixed(2)) : 0
}));

fs.writeFileSync(rankingsPath, JSON.stringify(reps, null, 2));
console.log(`Updated representatives-rankings.json with rubric-based scores, normalized values, vote stats, and misconduct penalties (${reps.length} records)`);
