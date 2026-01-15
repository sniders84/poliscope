// scripts/committee-reps-scraper.js
// Purpose: Map House committees from public/house-committees-current.json into representatives-rankings.json

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
  const committeesData = JSON.parse(fs.readFileSync(COMMITTEES_PATH, 'utf-8'));

  const repMap = new Map(reps.map(r => [r.bioguideId, r]));

  // Expected committeesData shape:
  // [
  //   {
  //     committee: "HSAP",
  //     committeeName: "Appropriations",
  //     members: [
  //       { bioguideId: "A000055", role: "Member", rank: 12, party: "majority" },
  //       ...
  //     ]
  //   },
  //   ...
  // ]
  for (const entry of committeesData) {
    const { committee, committeeName, members } = entry;
    if (!Array.isArray(members)) continue;

    for (const m of members) {
      const bio = m.bioguideId;
      if (!bio || !repMap.has(bio)) continue;

      const rep = repMap.get(bio);
      rep.committees.push({
        committee,
        committeeName,
        role: m.role || 'Member',
        rank: m.rank ?? null,
        party: m.party || null
      });
    }
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(reps, null, 2));
  console.log(`Updated committees for ${reps.length} representatives`);
})();
