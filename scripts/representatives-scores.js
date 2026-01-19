// scripts/representatives-scores.js
// Purpose: Compute scores for representatives based on votes + bills only (no amendments)

const fs = require('fs');
const path = require('path');

const rankingsPath = path.join(__dirname, '../public/representatives-rankings.json');
const outputPath = path.join(__dirname, '../public/representatives-scores.json');

const reps = JSON.parse(fs.readFileSync(rankingsPath, 'utf-8'));

const WEIGHTS = {
  bills: {
    sponsoredBills: 2,
    cosponsoredBills: 1,
    becameLawBills: 5,
    becameLawCosponsoredBills: 3
  },
  votes: {
    participationBonus: 2, // per 100 votes cast
    penaltyMissedPct: -10  // subtract if missed > 10%
  },
  committees: {
    Chair: 5,
    RankingMember: 4,
    Member: 1
  }
};

const scores = reps.map((r) => {
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

  // Votes
  const totalVotes = r.totalVotes || 0;
  const missedPct = r.missedVotePct || 0;
  if (totalVotes > 0) {
    score += Math.floor(totalVotes / 100) * WEIGHTS.votes.participationBonus;
  }
  if (missedPct > 10) {
    score += WEIGHTS.votes.penaltyMissedPct;
  }

  return {
    bioguideId: r.bioguideId,
    name: r.name,
    state: r.state,
    district: r.district,
    party: r.party,
    score,
    breakdown: {
      sponsoredBills: r.sponsoredBills,
      cosponsoredBills: r.cosponsoredBills,
      becameLawBills: r.becameLawBills,
      becameLawCosponsoredBills: r.becameLawCosponsoredBills,
      committees: r.committees,
      votes: {
        yeaVotes: r.yeaVotes,
        nayVotes: r.nayVotes,
        missedVotes: r.missedVotes,
        totalVotes: r.totalVotes,
        participationPct: r.participationPct,
        missedVotePct: r.missedVotePct
      }
    }
  };
});

fs.writeFileSync(outputPath, JSON.stringify(scores, null, 2));
console.log(`Wrote ${scores.length} representative score entries to ${outputPath}`);
