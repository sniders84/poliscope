// scripts/bootstrap-reps.js
// Purpose: Generate baseline representatives-rankings.json from local legislators-current.json
// Filters for House members and initializes vote/legislation fields

const fs = require('fs');
const path = require('path');

const IN_PATH = path.join(__dirname, '..', 'public', 'legislators-current.json');
const OUT_PATH = path.join(__dirname, '..', 'public', 'representatives-rankings.json');

(async () => {
  const data = JSON.parse(fs.readFileSync(IN_PATH, 'utf-8'));

  // Filter for current House members
  const reps = data.filter(r => {
    const t = r.terms.at(-1);
    return t.type === 'rep';
  }).map(r => {
    const t = r.terms.at(-1);
    return {
      bioguideId: r.id.bioguide,
      name: `${r.name.first} ${r.name.last}`,
      state: t.state,
      district: String(t.district || 'At-Large'),
      party: t.party,
      // initialize tallies
      yeaVotes: 0,
      nayVotes: 0,
      missedVotes: 0,
      totalVotes: 0,
      participationPct: 0,
      missedVotePct: 0,
      sponsoredBills: 0,
      cosponsoredBills: 0,
      sponsoredAmendments: 0,
      cosponsoredAmendments: 0,
      becameLawBills: 0,
      becameLawAmendments: 0,
      becameLawCosponsoredAmendments: 0,
      committees: []
    };
  });

  fs.writeFileSync(OUT_PATH, JSON.stringify(reps, null, 2));
  console.log(`Bootstrapped representatives-rankings.json with ${reps.length} current House members`);
})();
