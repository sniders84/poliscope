// scripts/committee-reps-scraper.js
// Purpose: Map House committees (object keyed by committee code) into representatives-rankings.json
// Explicitly parse "Chairman" and "Ranking Member" roles

const fs = require('fs');
const path = require('path');

const OUT_PATH = path.join(__dirname, '..', 'public', 'representatives-rankings.json');
const COMMITTEES_PATH = path.join(__dirname, '..', 'public', 'house-committees-current.json');

function ensureCommitteesShape(rep) {
  rep.committees = Array.isArray(rep.committees) ? rep.committees : [];
  return rep;
}

(function main() {
  const reps = JSON.parse(fs.readFileSync(OUT_PATH, 'utf-8')).map(ensureCommitteesShape);
  const committeesDataRaw = JSON.parse(fs.readFileSync(COMMITTEES_PATH, 'utf-8'));

  const repMap = new Map(reps.map(r => [r.bioguideId, r]));

  // committeesDataRaw is an object keyed by committee code, each value is an array of members
  for (const [committeeCode, members] of Object.entries(committeesDataRaw)) {
    if (!Array.isArray(members)) continue;

    for (const m of members) {
      const bio = m.bioguide;
      if (!bio || !repMap.has(bio)) continue;

      const rep = repMap.get(bio);

      // Normalize role
      let role = 'Member';
      if (m.title) {
        const t = m.title.toLowerCase();
        if (t.includes('chairman')) {
          role = 'Chairman';
        } else if (t.includes('ranking')) {
          role = 'Ranking Member';
        } else {
          role = m.title;
        }
      }

      rep.committees.push({
        committee: committeeCode,
        committeeName: m.committeeName || committeeCode, // plug in a lookup table if you have one
        role,
        rank: m.rank ?? null,
        party: m.party || null
      });
    }
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(reps, null, 2));
  console.log(`Updated committees for ${reps.length} representatives`);
})();
