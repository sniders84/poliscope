// scripts/bootstrap-reps.js
// Purpose: Create representatives-rankings.json with full schema for each member

const fs = require('fs');
const path = require('path');

const legislators = JSON.parse(fs.readFileSync('public/legislators-current.json','utf8'));
const reps = legislators.filter(l => {
  const lastTerm = l.terms[l.terms.length - 1];
  return lastTerm.type === 'rep';
}).map(l => {
  return {
    bioguideId: l.id.bioguide,
    name: l.name.official_full,
    sponsoredBills: 0,
    sponsoredAmendments: 0,
    cosponsoredBills: 0,
    cosponsoredAmendments: 0,
    becameLawBills: 0,
    becameLawAmendments: 0,
    becameLawCosponsoredAmendments: 0,
    committees: [],
    missedVotes: 0,
    totalVotes: 0,
    missedVotePct: 0,
    score: 0,
    scoreNormalized: 0,
    yeaVotes: 0,
    nayVotes: 0,
    participationPct: 0,
    rawScore: 0
  };
});

fs.writeFileSync(
  path.join(__dirname, '..', 'public', 'representatives-rankings.json'),
  JSON.stringify(reps, null, 2)
);

console.log(`Bootstrapped representatives-rankings.json with ${reps.length} members`);
