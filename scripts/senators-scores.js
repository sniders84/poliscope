/**
 * Senators scoring script
 *
 * Input:
 *   public/senators-rankings.json
 *
 * Output:
 *   public/senators-scores.json
 *
 * Logic:
 *   - Reads merged rankings (legislation, committees, votes)
 *   - Computes a composite score per senator
 *   - Writes scores JSON for downstream use
 */

const fs = require('fs');
const path = require('path');

const INPUT = path.join('public', 'senators-rankings.json');
const OUTPUT = path.join('public', 'senators-scores.json');

// Scoring weights (adjust as needed)
const WEIGHTS = {
  legislation: {
    sponsoredBills: 2,
    cosponsoredBills: 1,
    sponsoredBillBecameLaw: 5,
    cosponsoredBillBecameLaw: 3,
    sponsoredAmendment: 1,
    cosponsoredAmendment: 0.5,
    sponsoredResolution: 1,
    cosponsoredResolution: 0.5,
    sponsoredJointResolution: 2,
    cosponsoredJointResolution: 1,
    sponsoredJointResolutionBecameLaw: 5,
    cosponsoredJointResolutionBecameLaw: 3,
    sponsoredConcurrentResolution: 1,
    cosponsoredConcurrentResolution: 0.5,
  },
  committees: {
    Chair: 5,
    RankingMember: 4,
    Member: 1,
  },
  votes: {
    participationBonus: 2, // per 100 votes cast
    penaltyMissedPct: -10, // subtract if missed > 10%
  }
};

function run() {
  if (!fs.existsSync(INPUT)) {
    throw new Error(`Missing ${INPUT}. Run merge-senators.js first.`);
  }

  const raw = fs.readFileSync(INPUT, 'utf8');
  const senators = JSON.parse(raw);

  const scores = senators.map((s) => {
    let score = 0;

    // Legislation
    for (const [field, weight] of Object.entries(WEIGHTS.legislation)) {
      score += (s.legislation?.[field] || 0) * weight;
    }

    // Committees
    for (const c of s.committees || []) {
      const role = c.role;
      if (role === 'Chair') score += WEIGHTS.committees.Chair;
      else if (role === 'Ranking Member') score += WEIGHTS.committees.RankingMember;
      else score += WEIGHTS.committees.Member;
    }

    // Votes
    const totalVotes = s.votes?.totalVotes || 0;
    const missedPct = s.votes?.missedVotePct || 0;
    if (totalVotes > 0) {
      score += Math.floor(totalVotes / 100) * WEIGHTS.votes.participationBonus;
    }
    if (missedPct > 10) {
      score += WEIGHTS.votes.penaltyMissedPct;
    }

    return {
      bioguideId: s.bioguideId,
      score,
      breakdown: {
        legislation: s.legislation,
        committees: s.committees,
        votes: s.votes
      }
    };
  });

  const publicDir = path.join('public');
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

  fs.writeFileSync(OUTPUT, JSON.stringify(scores, null, 2));
  console.log(`Wrote ${OUTPUT} with ${scores.length} senator entries.`);
}

run();
