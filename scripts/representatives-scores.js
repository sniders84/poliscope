// scripts/representatives-scores.js
// Purpose: Compute rubric-based Power Scores for House members and overwrite representatives-rankings.json
// Includes:
//   - Legislation scoring
//   - Committee hierarchy scoring (HSxx only)
//   - Missed vote penalties
//   - Misconduct penalties
//   - Full breakdown for UI

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

// ------------------------------------------------------------
// SCORING CONSTANTS
// ------------------------------------------------------------

const WEIGHTS = {
  bills: {
    sponsoredBills: 1.2,
    cosponsoredBills: 0.6,
    becameLawBills: 6.0,
    becameLawCosponsoredBills: 3.0
  },
  committees: {
    Chair: 4,
    Ranking: 3,
    Vice: 2,
    Member: 1
  },
  votes: {
    missedVotePenalty: -0.5
  },
  misconduct: {
    penaltyPerInfraction: -10.0
  }
};

// ------------------------------------------------------------
// SCORING ENGINE
// ------------------------------------------------------------

reps = reps.map(s => {
  let score = 0;

  // -----------------------------
  // LEGISLATION
  // -----------------------------
  const billsSponsoredScore = (s.sponsoredBills || 0) * WEIGHTS.bills.sponsoredBills;
  const billsCosponsoredScore = (s.cosponsoredBills || 0) * WEIGHTS.bills.cosponsoredBills;
  const billsEnactedScore = (s.becameLawBills || 0) * WEIGHTS.bills.becameLawBills;
  const billsEnactedCosponsoredScore =
    (s.becameLawCosponsoredBills || 0) * WEIGHTS.bills.becameLawCosponsoredBills;

  score += billsSponsoredScore;
  score += billsCosponsoredScore;
  score += billsEnactedScore;
  score += billsEnactedCosponsoredScore;

  // -----------------------------
  // COMMITTEES (Hierarchy Scoring)
  // -----------------------------
  let chairCount = 0;
  let rankingCount = 0;
  let viceCount = 0;
  let memberCount = 0;

  for (const c of s.committees || []) {
    const role = (c.role || "").toLowerCase();

    if (role.includes("chair")) {
      chairCount++;
    } else if (role.includes("ranking")) {
      rankingCount++;
    } else if (role.includes("vice")) {
      viceCount++;
    } else {
      memberCount++;
    }
  }

  const chairScore = chairCount * WEIGHTS.committees.Chair;
  const rankingScore = rankingCount * WEIGHTS.committees.Ranking;
  const viceScore = viceCount * WEIGHTS.committees.Vice;
  const memberScore = memberCount * WEIGHTS.committees.Member;

  const committeeScore =
    chairScore + rankingScore + viceScore + memberScore;

  score += committeeScore;

  // -----------------------------
  // MISSED VOTES
  // -----------------------------
  const missedVotes = s.missedVotes || 0;
  const missedVotesScore = missedVotes * WEIGHTS.votes.missedVotePenalty;
  score += missedVotesScore;

  // -----------------------------
  // MISCONDUCT
  // -----------------------------
  const misconductCount = s.misconductCount || 0;
  const misconductScore = misconductCount * WEIGHTS.misconduct.penaltyPerInfraction;
  score += misconductScore;

  // -----------------------------
  // FINALIZE
  // -----------------------------
  if (score < 0) score = 0;

  const finalScore = Number(score.toFixed(1));

  return {
    ...s,
    powerScore: finalScore,
    scoreBreakdown: {
      billsSponsored: {
        raw: s.sponsoredBills || 0,
        weight: WEIGHTS.bills.sponsoredBills,
        contribution: billsSponsoredScore
      },
      billsCosponsored: {
        raw: s.cosponsoredBills || 0,
        weight: WEIGHTS.bills.cosponsoredBills,
        contribution: billsCosponsoredScore
      },
      billsEnacted: {
        raw: s.becameLawBills || 0,
        weight: WEIGHTS.bills.becameLawBills,
        contribution: billsEnactedScore
      },
      billsEnactedCosponsored: {
        raw: s.becameLawCosponsoredBills || 0,
        weight: WEIGHTS.bills.becameLawCosponsoredBills,
        contribution: billsEnactedCosponsoredScore
      },
      committees: {
        chair: { count: chairCount, weight: WEIGHTS.committees.Chair, contribution: chairScore },
        ranking: { count: rankingCount, weight: WEIGHTS.committees.Ranking, contribution: rankingScore },
        vice: { count: viceCount, weight: WEIGHTS.committees.Vice, contribution: viceScore },
        member: { count: memberCount, weight: WEIGHTS.committees.Member, contribution: memberScore },
        total: committeeScore
      },
      missedVotes: {
        raw: missedVotes,
        weight: WEIGHTS.votes.missedVotePenalty,
        contribution: missedVotesScore
      },
      misconduct: {
        raw: misconductCount,
        weight: WEIGHTS.misconduct.penaltyPerInfraction,
        contribution: misconductScore
      },
      totalPowerScore: finalScore
    },
    lastUpdated: new Date().toISOString()
  };
});

// ------------------------------------------------------------
// WRITE OUTPUT
// ------------------------------------------------------------

fs.writeFileSync(rankingsPath, JSON.stringify(reps, null, 2));
console.log(`Updated representatives-rankings.json with rubric-based Power Scores (${reps.length} records)`);
