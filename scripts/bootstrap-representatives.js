// scripts/bootstrap-representatives.js
// Purpose: Generate baseline representatives-rankings.json from local legislators-current.json
// Filters for current Representatives and initializes clean schema (no amendments, no votes)

const fs = require('fs');
const path = require('path');

const ROSTER_PATH = path.join(__dirname, '..', 'public', 'legislators-current.json');
const OUT_PATH = path.join(__dirname, '..', 'public', 'representatives-rankings.json');

const roster = JSON.parse(fs.readFileSync(ROSTER_PATH, 'utf-8'));

function baseRecord(rep) {
  const lastTerm = rep.terms.at(-1);
  return {
    bioguideId: rep.id.bioguide,
    name: `${rep.name.first} ${rep.name.last}`,
    state: lastTerm.state,
    district: lastTerm.district || '',
    party: lastTerm.party,
    office: 'Representative',
    // Legislation (placeholders — filled by merge)
    sponsoredBills: 0,
    cosponsoredBills: 0,
    becameLawBills: 0,
    becameLawCosponsoredBills: 0,
    // Committees (filled by merge)
    committees: [],
    // Misconduct (filled by misconduct-scraper.js)
    misconductCount: 0,
    misconductTags: [],
    // Votes (filled by votes-reps-scraper.js)
    yeaVotes: 0,
    nayVotes: 0,
    missedVotes: 0,
    totalVotes: 0,
    participationPct: 0,
    missedVotePct: 0,
    // Streak (consecutive weeks with activity)
    streak: 0,
    // Scores (filled by representatives-scores.js)
    powerScore: 0,
    lastUpdated: new Date().toISOString()
  };
}

const reps = roster
  .filter(r => {
    const t = r.terms.at(-1);
    return t.type === 'rep' && new Date(t.end) > new Date();
  })
  .map(baseRecord);

fs.writeFileSync(OUT_PATH, JSON.stringify(reps, null, 2));
console.log(`Bootstrapped representatives-rankings.json with ${reps.length} current Representatives`);
