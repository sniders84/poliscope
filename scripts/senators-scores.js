// scripts/senators-scores.js
// Purpose: Compute scores for senators based on votes + bills only (no amendments)

const fs = require('fs');
const path = require('path');

const rankingsPath = path.join(__dirname, '../public/senators-rankings.json');
const outputPath = path.join(__dirname, '../public/senators-scores.json');

const senators = JSON.parse(fs.readFileSync(rankingsPath, 'utf-8'));

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

const scores = senators.map((s) => {
  let score = 0;

  // Legislation (bills only)
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

  return {
    bioguideId: s.bioguideId,
    name: s.name,
    state: s.state,
    party: s.party,
    score,
    breakdown: {
      sponsoredBills: s.sponsoredBills,
      cosponsoredBills: s.cosponsoredBills,
      becameLawBills: s.becameLawBills,
      becameLawCosponsoredBills: s.becameLawCosponsoredBills,
      committees: s.committees,
      votes: {
        yeaVotes: s.yeaVotes,
        nayVotes: s.nayVotes,
        missedVotes: s.missedVotes,
        totalVotes: s.totalVotes,
        participationPct: s.participationPct,
        missedVotePct: s.missedVotePct
      }
    }
  };
});

fs.writeFileSync(outputPath, JSON.stringify(scores, null, 2));
console.log(`Wrote ${scores.length} senator score entries to ${outputPath}`);
