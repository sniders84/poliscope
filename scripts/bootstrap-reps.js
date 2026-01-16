// scripts/bootstrap-rankings.js
// Purpose: Initialize representatives-rankings.json and senators-rankings.json
// with full identity fields from legislators-current.json

const fs = require('fs');
const path = require('path');

const ROSTER_PATH = path.join(__dirname, '..', 'public', 'legislators-current.json');
const REPS_OUT = path.join(__dirname, '..', 'public', 'representatives-rankings.json');
const SENATORS_OUT = path.join(__dirname, '..', 'public', 'senators-rankings.json');

const roster = JSON.parse(fs.readFileSync(ROSTER_PATH, 'utf-8'));

function baseRecord(rep, office) {
  const lastTerm = rep.terms[rep.terms.length - 1];
  return {
    bioguideId: rep.id.bioguide,
    name: `${rep.name.first} ${rep.name.last}`,
    state: lastTerm.state,
    party: lastTerm.party,
    office,
    sponsoredBills: 0,
    cosponsoredBills: 0,
    sponsoredAmendments: 0,
    cosponsoredAmendments: 0,
    becameLawBills: 0,
    becameLawAmendments: 0,
    becameLawCosponsoredAmendments: 0,
    committees: [],
    yeaVotes: 0,
    nayVotes: 0,
    missedVotes: 0,
    totalVotes: 0,
    participationPct: 0,
    missedVotePct: 0,
    rawScore: 0,
    score: 0,
    scoreNormalized: 0
  };
}

const reps = roster
  .filter(r => r.terms.some(t => t.type === 'rep'))
  .map(r => baseRecord(r, 'Representative'));

const senators = roster
  .filter(r => r.terms.some(t => t.type === 'sen'))
  .map(r => baseRecord(r, 'Senator'));

fs.writeFileSync(REPS_OUT, JSON.stringify(reps, null, 2));
fs.writeFileSync(SENATORS_OUT, JSON.stringify(senators, null, 2));

console.log(`Bootstrapped ${reps.length} representatives and ${senators.length} senators`);
