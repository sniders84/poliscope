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

  // Raw score
  reps.forEach(r => {
    const raw =
      r.sponsoredBills * WEIGHTS.sponsoredBills +
      r.cosponsoredBills * WEIGHTS.cosponsoredBills +
      r.sponsoredAmendments * WEIGHTS.sponsoredAmendments +
      r.cosponsoredAmendments * WEIGHTS.cosponsoredAmendments +
      r.yeaVotes * WEIGHTS.yeaVotes +
      r.nayVotes * WEIGHTS.nayVotes +
      committeePoints(Array.isArray(r.committees) ? r.committees : []) +
      r.missedVotes * WEIGHTS.missedVotesPenalty;

    r.rawScore = Math.max(0, Math.round(raw * 100) / 100);
  });

  // Normalize 0–100
  const maxRaw = reps.reduce((m, r) => Math.max(m, r.rawScore || 0), 0) || 1;
  reps.forEach(r => {
    r.scoreNormalized = Math.round(((r.rawScore || 0) / maxRaw) * 10000) / 100;
  });

  fs.writeFileSync(OUT_PATH, JSON.stringify(reps, null, 2));
  console.log('Scoring complete for House representatives');
})();
