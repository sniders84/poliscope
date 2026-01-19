
// scripts/bootstrap-senators.js
// Purpose: Generate baseline senators-rankings.json from local legislators-current.json
// Filters for current Senators and initializes full schema

const fs = require('fs');
const path = require('path');

const ROSTER_PATH = path.join(__dirname, '..', 'public', 'legislators-current.json');
const OUT_PATH = path.join(__dirname, '..', 'public', 'senators-rankings.json');

// Load roster
const roster = JSON.parse(fs.readFileSync(ROSTER_PATH, 'utf-8'));

// Build baseline record for each senator
function baseRecord(sen) {
  const lastTerm = sen.terms[sen.terms.length - 1];
  return {
    // Identity
    bioguideId: sen.id.bioguide,
    name: `${sen.name.first} ${sen.name.last}`,
    state: lastTerm.state,
    district: 'At-Large',
    party: lastTerm.party,
    office: 'Senator',

    // Votes
    yeaVotes: 0,
    nayVotes: 0,
    missedVotes: 0,
    totalVotes: 0,
    participationPct: 0,
    missedVotePct: 0,

    // Legislation
    sponsoredBills: 0,
    cosponsoredBills: 0,
    sponsoredAmendments: 0,
    cosponsoredAmendments: 0,
    becameLawSponsored: 0,
    becameLawCosponsored: 0,

    // Committees
    committees: [],

    // Scores
    rawScore: 0,
    score: 0,
    scoreNormalized: 0
  };
}

// Filter for current senators (term type 'sen' and end date in the future)
const sens = roster
  .filter(r => {
    const t = r.terms[r.terms.length - 1];
    return t.type === 'sen' && new Date(t.end) > new Date();
  })
  .map(baseRecord);

// Write output file
fs.writeFileSync(OUT_PATH, JSON.stringify(sens, null, 2));
console.log(`Bootstrapped senators-rankings.json with ${sens.length} current Senators`);
