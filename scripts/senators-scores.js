/**
 * Senators scores
 * - Reads public/senators-rankings.json
 * - Computes a composite score per senator
 * - Outputs public/senators-scores.json
 *
 * Scoring model (tweakable weights):
 * - Sponsored weight: 2.0
 * - Cosponsored weight: 1.0
 * - Committee leadership bonus: +5 per leadership role (Chair, Ranking Member)
 * - Committee membership bonus: +1 per committee
 * - Missed vote penalty: -0.5 per percentage point missed (e.g., 3.2% => -1.6)
 */

const fs = require('fs');
const path = require('path');

const INPUT = path.join('public', 'senators-rankings.json');
const OUTPUT = path.join('public', 'senators-scores.json');

const WEIGHTS = {
  sponsored: 2.0,
  cosponsored: 1.0,
  committeeLeadershipBonus: 5.0,
  committeeMembershipBonus: 1.0,
  missedVotePenaltyPerPct: 0.5,
};

function safeNum(n) {
  return typeof n === 'number' && !isNaN(n) ? n : 0;
}

function computeScore(s) {
  const sponsored = safeNum(s.sponsored);
  const cosponsored = safeNum(s.cosponsored);
  const missedPct = safeNum(s.missedVotePct);

  const committees = Array.isArray(s.committees) ? s.committees : [];
  let committeeMemberships = 0;
  let committeeLeaderships = 0;

  for (const c of committees) {
    committeeMemberships += 1;
    const role = (c.role || '').toLowerCase();
    if (role.includes('chair') || role.includes('ranking')) {
      committeeLeaderships += 1;
    }
  }

  const score =
    sponsored * WEIGHTS.sponsored +
    cosponsored * WEIGHTS.cosponsored +
    committeeLeaderships * WEIGHTS.committeeLeadershipBonus +
    committeeMemberships * WEIGHTS.committeeMembershipBonus -
    missedPct * WEIGHTS.missedVotePenaltyPerPct;

  return +score.toFixed(2);
}

function run() {
  if (!fs.existsSync(INPUT)) {
    console.log('No rankings file found, skipping scores.');
    process.exit(0);
  }

  const rankings = JSON.parse(fs.readFileSync(INPUT, 'utf8'));
  const results = rankings.map(s => ({
    bioguideId: s.bioguideId,
    sponsored: safeNum(s.sponsored),
    cosponsored: safeNum(s.cosponsored),
    totalVotes: safeNum(s.totalVotes),
    missedVotes: safeNum(s.missedVotes),
    missedVotePct: safeNum(s.missedVotePct),
    committees: Array.isArray(s.committees) ? s.committees : [],
    score: computeScore(s),
  }));

  // Optional: normalize to 0–100 scale
  const maxScore = results.reduce((m, r) => Math.max(m, r.score), 0);
  const minScore = results.reduce((m, r) => Math.min(m, r.score), maxScore);
  const span = Math.max(1, maxScore - minScore);

  const normalized = results.map(r => ({
    ...r,
    scoreNormalized: +(((r.score - minScore) / span) * 100).toFixed(2),
  }));

  fs.writeFileSync(OUTPUT, JSON.stringify(normalized, null, 2));
  console.log(`Wrote ${OUTPUT} with ${normalized.length} senator entries.`);
}

run();
