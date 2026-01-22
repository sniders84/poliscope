// scripts/bootstrap-senators.js
// Purpose: Generate baseline senators-rankings.json from local legislators-current.json
// Filters for current Senators and initializes clean schema (no amendments, no votes)
const fs = require('fs');
const path = require('path');

const ROSTER_PATH = path.join(__dirname, '..', 'public', 'legislators-current.json');
const OUT_PATH = path.join(__dirname, '..', 'public', 'senators-rankings.json');

const roster = JSON.parse(fs.readFileSync(ROSTER_PATH, 'utf-8'));

function baseRecord(sen) {
  const lastTerm = sen.terms.at(-1);
  return {
    bioguideId: sen.id.bioguide,
    name: `${sen.name.first} ${sen.name.last}`,
    state: lastTerm.state,
    district: 'At-Large',
    party: lastTerm.party,
    office: 'Senator',
    // Legislation (placeholders — filled by merge)
    sponsoredBills: 0,
    cosponsoredBills: 0,
    becameLawBills: 0,
    becameLawCosponsoredBills: 0,
    // Committees (filled by merge)
    committees: [],
    // Scores (filled by senators-scores.js)
    powerScore: 0,
    lastUpdated: new Date().toISOString()
  };
}

const sens = roster
  .filter(r => {
    const t = r.terms.at(-1);
    return t.type === 'sen' && new Date(t.end) > new Date();
  })
  .map(baseRecord);

fs.writeFileSync(OUT_PATH, JSON.stringify(sens, null, 2));
console.log(`Bootstrapped senators-rankings.json with ${sens.length} current Senators`);
