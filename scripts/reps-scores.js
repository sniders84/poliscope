// scripts/reps-scores.js
// Purpose: Compute scores for representatives-rankings.json

const fs = require('fs');
const path = require('path');

const IN_PATH = path.join(__dirname, '..', 'public', 'representatives-rankings.json');
const OUT_PATH = path.join(__dirname, '..', 'public', 'representatives-scores.json');

function computeScore(member) {
  const bills = (member.sponsoredBills || 0) + (member.cosponsoredBills || 0);
  const laws = (member.becameLawBills || 0) + (member.becameLawCosponsoredBills || 0);
  const amends = (member.sponsoredAmendments || 0) + (member.cosponsoredAmendments || 0);
  const lawsAmends = (member.becameLawAmendments || 0) + (member.becameLawCosponsoredAmendments || 0);
  const committees = Array.isArray(member.committees) ? member.committees.length : 0;
  const participation = member.participationPct || 0;

  let raw = 0;
  raw += bills * 1;
  raw += laws * 3;
  raw += amends * 1;
  raw += lawsAmends * 2;
  raw += committees * 2;
  raw += participation * 0.5;

  member.rawScore = raw;
  member.score = raw;
  return member;
}

(function main() {
  let reps = [];
  try {
    reps = JSON.parse(fs.readFileSync(IN_PATH, 'utf-8')).map(computeScore);
  } catch (e) {
    console.error('Failed to read representatives-rankings.json:', e.message);
    process.exit(1);
  }

  const maxScore = Math.max(...reps.map(m => m.score), 0);
  for (const m of reps) {
    m.scoreNormalized = maxScore > 0 ? Number(((m.score / maxScore) * 100).toFixed(2)) : 0;
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(reps, null, 2));
  console.log(`Scored ${reps.length} representatives; normalized to 0–100 → representatives-scores.json`);
})();
