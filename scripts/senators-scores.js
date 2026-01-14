/**
 * Senators Scores Calculator
 * - Reads public/senators-rankings.json
 * - Computes composite score per senator based on legislation, committees, and missed votes
 * - Updates senators-rankings.json directly with score and normalized score
 * - No separate output file — consolidates everything
 */
const fs = require('fs');
const path = require('path');

const RANKINGS_PATH = path.join(__dirname, '../public/senators-rankings.json');

const WEIGHTS = {
  sponsoredBills: 2.0,          // Weight for sponsored legislation (bills + resolutions)
  cosponsoredBills: 1.0,        // Weight for cosponsored legislation
  sponsoredAmendments: 1.5,     // Slightly higher for amendments (more effort)
  cosponsoredAmendments: 0.75,
  committeeLeadershipBonus: 5.0, // Chairman / Ranking Member
  committeeMembershipBonus: 1.0, // Regular member
  missedVotePenaltyPerPct: 0.5   // Penalty per 1% missed
};

function safeNum(n) {
  return typeof n === 'number' && !isNaN(n) ? n : 0;
}

function isLeadership(role) {
  if (!role) return false;
  const lower = role.toLowerCase();
  return lower.includes('chair') || 
         lower.includes('ranking') || 
         lower.includes('vice chair') || 
         lower.includes('chairman') || 
         lower.includes('ranking member');
}

function computeScore(sen) {
  const sponsoredLeg = safeNum(sen.sponsoredBills) + safeNum(sen.sponsoredAmendments);
  const cosponsoredLeg = safeNum(sen.cosponsoredBills) + safeNum(sen.cosponsoredAmendments);

  const committees = Array.isArray(sen.committees) ? sen.committees : [];
  let committeeMemberships = committees.length;
  let committeeLeaderships = 0;

  for (const c of committees) {
    if (isLeadership(c.role)) committeeLeaderships++;
  }

  const missedPct = safeNum(sen.totalVotes) > 0 
    ? (safeNum(sen.missedVotes) / safeNum(sen.totalVotes)) * 100 
    : 0;

  const rawScore = 
    sponsoredLeg * WEIGHTS.sponsoredBills +
    cosponsoredLeg * WEIGHTS.cosponsoredBills +
    safeNum(sen.sponsoredAmendments) * WEIGHTS.sponsoredAmendments +
    safeNum(sen.cosponsoredAmendments) * WEIGHTS.cosponsoredAmendments +
    committeeLeaderships * WEIGHTS.committeeLeadershipBonus +
    committeeMemberships * WEIGHTS.committeeMembershipBonus -
    missedPct * WEIGHTS.missedVotePenaltyPerPct;

  return +rawScore.toFixed(2);
}

function run() {
  if (!fs.existsSync(RANKINGS_PATH)) {
    console.log('No senators-rankings.json found, skipping scores.');
    return;
  }

  let rankings;
  try {
    rankings = JSON.parse(fs.readFileSync(RANKINGS_PATH, 'utf8'));
  } catch (err) {
    console.error('Failed to parse rankings.json:', err.message);
    return;
  }

  const scores = rankings.map(sen => computeScore(sen));

  // Find min/max for normalization
  const validScores = scores.filter(s => s !== 0);
  const maxScore = validScores.length > 0 ? Math.max(...validScores) : 1;
  const minScore = validScores.length > 0 ? Math.min(...validScores) : 0;
  const span = Math.max(1, maxScore - minScore);

  rankings.forEach((sen, idx) => {
    const raw = scores[idx];
    sen.score = raw;
    sen.scoreNormalized = span > 0 ? +(((raw - minScore) / span) * 100).toFixed(2) : 0;
    console.log(`Scored ${sen.name}: raw ${raw}, normalized ${sen.scoreNormalized}`);
  });

  try {
    fs.writeFileSync(RANKINGS_PATH, JSON.stringify(rankings, null, 2));
    console.log(`Updated senators-rankings.json with scores for ${rankings.length} senators`);
  } catch (err) {
    console.error('Failed to write rankings.json:', err.message);
  }
}

run();
