// scripts/merge-reps.js
// Purpose: Merge House data sources into representatives-rankings.json

const fs = require('fs');
const path = require('path');

const OUT_PATH = path.join(__dirname, '..', 'public', 'representatives-rankings.json');

const reps = JSON.parse(fs.readFileSync(OUT_PATH, 'utf-8'));
const legislation = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'public', 'house-legislation.json'), 'utf-8'));
const committees = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'public', 'house-committees.json'), 'utf-8'));
const votes = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'public', 'house-votes.json'), 'utf-8'));

const repMap = new Map(reps.map(r => [r.bioguideId, r]));

// merge legislation
for (const l of legislation) {
  const rep = repMap.get(l.bioguideId);
  if (rep) {
    rep.sponsoredBills = l.sponsoredBills || 0;
    rep.sponsoredAmendments = l.sponsoredAmendments || 0;
    rep.cosponsoredBills = l.cosponsoredBills || 0;
    rep.cosponsoredAmendments = l.cosponsoredAmendments || 0;
    rep.becameLawBills = l.becameLawBills || 0;
    rep.becameLawAmendments = l.becameLawAmendments || 0;
    rep.becameLawCosponsoredAmendments = l.becameLawCosponsoredAmendments || 0;
  }
}

// merge committees
for (const c of committees) {
  const rep = repMap.get(c.bioguideId);
  if (rep) {
    rep.committees = c.committees || [];
  }
}

// merge votes
for (const [bioguideId, v] of Object.entries(votes)) {
  const rep = repMap.get(bioguideId);
  if (rep) {
    rep.yeaVotes = v.yea;
    rep.nayVotes = v.nay;
    rep.missedVotes = v.missed;
    rep.totalVotes = v.total;
    if (v.total > 0) {
      rep.participationPct = Number(((v.yea + v.nay) / v.total * 100).toFixed(2));
      rep.missedVotePct = Number(((v.missed / v.total) * 100).toFixed(2));
    }
  }
}

fs.writeFileSync(OUT_PATH, JSON.stringify(reps, null, 2));
console.log(`Merge complete: ${reps.length} representatives total
- Legislation merged for ${legislation.length} reps
- Committees merged for ${committees.length} reps
- Votes merged for ${Object.keys(votes).length} reps`);
