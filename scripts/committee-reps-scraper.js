// scripts/committee-reps-scraper.js
const fs = require('fs');
const path = require('path');

const OUT_PATH = path.join(__dirname, '..', 'public', 'representatives-rankings.json');
const COMMITTEES_PATH = path.join(__dirname, '..', 'public', 'representatives-committees.json');

(function main() {
  let reps = JSON.parse(fs.readFileSync(OUT_PATH, 'utf-8'));
  let committeesDataRaw = JSON.parse(fs.readFileSync(COMMITTEES_PATH, 'utf-8'));

  const repMap = new Map(reps.map(r => [r.bioguideId.toUpperCase(), r]));

  const committeeArray = Array.isArray(committeesDataRaw)
    ? committeesDataRaw
    : Object.entries(committeesDataRaw).map(([code, data]) => ({
        code,
        name: data.name || code,
        members: data.members || []
      }));

  for (const c of committeeArray) {
    if (!Array.isArray(c.members)) continue;

    for (const m of c.members) {
      const bio = (m.bioguide || m.bioguideId || m.id || '').toUpperCase();
      if (!bio || !repMap.has(bio)) continue;

      const rep = repMap.get(bio);
      rep.committees = rep.committees || [];

      let role = 'Member';
      if (m.title) {
        const t = m.title.toLowerCase();
        if (t.includes('chair')) role = 'Chair';
        else if (t.includes('ranking')) role = 'Ranking Member';
        else if (t.includes('vice')) role = 'Vice Chair';
        else role = m.title;
      }

      const entry = {
        committeeCode: c.code,
        committeeName: c.name,
        role,
        rank: m.rank ?? null,
        party: m.party || null
      };

      const exists = rep.committees.some(
        x => x.committeeCode === entry.committeeCode && x.role === entry.role
      );
      if (!exists) {
        rep.committees.push(entry);
      }
    }
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(Array.from(repMap.values()), null, 2));
  console.log(`Updated committees in ${OUT_PATH}`);
})();
