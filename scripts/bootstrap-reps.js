// scripts/bootstrap-reps.js
// Purpose: Generate baseline representatives-rankings.json from local legislators-current.json
// Filters for current House members and initializes sponsored/cosponsored bill tallies

const fs = require('fs');
const path = require('path');

const IN_PATH = path.join(__dirname, '..', 'public', 'legislators-current.json');
const OUT_PATH = path.join(__dirname, '..', 'public', 'representatives-rankings.json');

(async () => {
  const data = JSON.parse(fs.readFileSync(IN_PATH, 'utf-8'));

  // Filter for current House members
  const reps = data.filter(r => {
    const t = r.terms.at(-1);
    return t.type === 'rep' && new Date(t.end) > new Date();
  }).map(r => {
    const t = r.terms.at(-1);
    return {
      bioguideId: r.id.bioguide,
      name: `${r.name.first} ${r.name.last}`,
      state: t.state,
      district: String(t.district || 'At-Large'),
      party: t.party,
      office: 'Representative',
      // initialize tallies
      sponsoredBills119: 0,
      cosponsoredBills119: 0
    };
  });

  fs.writeFileSync(OUT_PATH, JSON.stringify(reps, null, 2));
  console.log(`Bootstrapped representatives-rankings.json with ${reps.length} current House members`);
})();
