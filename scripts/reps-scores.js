// scripts/reps-scores.js
// Purpose: Compute raw + normalized scores for House reps using legislation + votes + committees

const fs = require('fs');
const path = require('path');

const OUT_PATH = path.join(__dirname, '..', 'public', 'representatives-rankings.json');

// Scoring weights—tune as needed
const WEIGHTS = {
  sponsoredBills: 4,
  cosponsoredBills: 1,
  sponsoredAmendments: 3,
  cosponsoredAmendments: 1,
  becameLawBills: 5,
  becameLawAmendments: 4,
  becameLawCosponsoredAmendments: 2,
  yeaVotes: 0.5,
  nayVotes: 0.5,
  missedVotesPenalty: -2,
  committeeMember: 1,
  committeeChair: 6,
  committeeRanking: 4,
};

function committeePoints(committees) {
  let pts = 0;
  committees.forEach(c => {
    const role = (c.role || 'Member').toLowerCase();
    if (role.includes('chair')) pts += WEIGHTS.committeeChair;
    else if (role.includes('ranking')) pts += WEIGHTS.committeeRanking;
    else pts += WEIGHTS.committeeMember;
  });
  return pts;
}

(function main() {
  const reps = JSON.parse(fs.readFileSync(OUT_PATH, 'utf-8'));

  reps.forEach(r => {
    // Ensure schema completeness
    r.sponsoredBills = r.sponsoredBills || 0;
    r.sponsoredAmendments = r.sponsoredAmendments || 0;
    r.cosponsoredBills = r.cosponsoredBills || 0;
    r.cosponsoredAmendments = r.cosponsoredAmendments || 0;
    r.becameLawBills = r.becameLawBills || 0;
    r.becameLawAmendments = r.becameLawAmendments || 0;
    r.becameLawCosponsoredAmendments = r.becameLawCosponsoredAmendments || 0;
    r.yeaVotes = r.yeaVotes || 0;
    r.nayVotes = r.nayVotes || 0;
    r.missedVotes = r.missedVotes || 0;
    r.totalVotes = r.totalVotes || 0;
    r.committees = Array.isArray(r.committees) ? r.committees : [];

    // Raw score calculation
    const raw =
      r.sponsoredBills * WEIGHTS.sponsoredBills +
      r.cosponsoredBills * WEIGHTS.cosponsoredBills +
      r.sponsoredAmendments * WEIGHTS.sponsoredAmendments +
      r.cosponsoredAmendments * WEIGHTS.cosponsoredAmendments +
      r.becameLawBills * WEIGHTS.becameLawBills +
      r.becameLawAmendments * WEIGHTS.becameLawAmendments +
      r.becameLawCosponsoredAmendments * WEIGHTS.becameLawCosponsoredAmendments +
      r.yeaVotes * WEIGHTS.yeaVotes +
      r.nayVotes * WEIGHTS.nayVotes +
      committeePoints(r.committees) +
      r.missedVotes * WEIGHTS.missedVotesPenalty;

    r.rawScore = Math.max(0, Math.round(raw * 100) / 100);

    // Participation / missed vote percentages
    if (r.totalVotes > 0) {
      r.participationPct = Number(((r.yeaVotes + r.nayVotes) / r.totalVotes * 100).toFixed(2));
      r.missedVotePct = Number(((r.missedVotes / r.totalVotes) * 100).toFixed(2));
    } else {
      r.participationPct = 0;
      r.missedVotePct = 0;
    }
  });

  // Normalize 0–100
  const maxRaw = reps.reduce((m, r) => Math.max(m, r.rawScore || 0), 0) || 1;
  reps.forEach(r => {
    r.score = r.rawScore; // keep score field aligned with rawScore
    r.scoreNormalized = Math.round(((r.rawScore || 0) / maxRaw) * 10000) / 100;
  });

  fs.writeFileSync(OUT_PATH, JSON.stringify(reps, null, 2));
  console.log('Scoring complete for House representatives');
})();
