// scripts/bootstrap-senators.js
// Purpose: Bootstrap senators-rankings.json with all current Senators

const fs = require('fs');
const path = require('path');

const ROSTER_PATH = path.join(__dirname, '..', 'public', 'legislators-current.json');
const OUT_PATH = path.join(__dirname, '..', 'public', 'senators-rankings.json');

const roster = JSON.parse(fs.readFileSync(ROSTER_PATH, 'utf-8'));

function baseRecord(sen) {
  const lastTerm = sen.terms[sen.terms.length - 1];
  return {
    bioguideId: sen.id.bioguide,
    name: `${sen.name.first} ${sen.name.last}`,
    state: lastTerm.state,
    district: 'At-Large',
    party: lastTerm.party,
    office: 'Senator',
    // Legislation
    sponsoredBills: 0,
    cosponsoredBills: 0,
    becameLawBills: 0,
    becameLawCosponsoredBills: 0,
    sponsoredAmendments: 0,
    cosponsoredAmendments: 0,
    becameLawAmendments: 0,
    becameLawCosponsoredAmendments: 0,
    // Committees
    committees: [],
    // Votes
    yeaVotes: 0,
    nayVotes: 0,
    missedVotes: 0,
    totalVotes: 0,
    participationPct: 0,
    missedVotePct: 0,
    // Scores
    rawScore: 0,
    score: 0,
    scoreNormalized: 0
  };
}

const sens = roster
  .filter(r => {
    const t = r.terms[r.terms.length - 1];
    return t.type === 'sen' && new Date(t.end) > new Date();
  })
  .map(baseRecord);

fs.writeFileSync(OUT_PATH, JSON.stringify(sens, null, 2));
console.log(`Bootstrapped senators-rankings.json with ${sens.length} current Senators`);
