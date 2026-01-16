// scripts/bootstrap-reps.js
// Purpose: Bootstrap representatives-rankings.json with all current House members

const fs = require('fs');
const path = require('path');

const ROSTER_PATH = path.join(__dirname, '..', 'public', 'legislators-current.json');
const OUT_PATH = path.join(__dirname, '..', 'public', 'representatives-rankings.json');

const roster = JSON.parse(fs.readFileSync(ROSTER_PATH, 'utf-8'));

function baseRecord(rep) {
  const lastTerm = rep.terms[rep.terms.length - 1];
  return {
    bioguideId: rep.id.bioguide,
    name: `${rep.name.first} ${rep.name.last}`,
    state: lastTerm.state,
    district: lastTerm.district || 'At-Large',
    party: lastTerm.party,
    office: 'Representative',
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

const reps = roster
  .filter(r => {
    const t = r.terms[r.terms.length - 1];
    return t.type === 'rep' && new Date(t.end) > new Date();
  })
  .map(baseRecord);

fs.writeFileSync(OUT_PATH, JSON.stringify(reps, null, 2));
console.log(`Bootstrapped representatives-rankings.json with ${reps.length} current House members`);
