// scripts/committee-reps-scraper.js
// Purpose: Attach committee memberships + leadership flags for House Representatives
// Source: public/house-committee-membership-current.json (or .yaml)

const fs = require('fs');
const path = require('path');

const OUT_PATH = path.join(__dirname, '..', 'public', 'representatives-rankings.json');
const COMMITTEE_SOURCE = path.join(__dirname, '..', 'public', 'house-committee-membership-current.json');

(function main() {
  const reps = JSON.parse(fs.readFileSync(OUT_PATH, 'utf-8'));
  const repMap = new Map(reps.map(r => [r.bioguideId, r]));

  if (!fs.existsSync(COMMITTEE_SOURCE)) {
    console.log('No house-committee-membership-current.json found; skipping committees');
    fs.writeFileSync(OUT_PATH, JSON.stringify(reps, null, 2));
    return;
  }

  const memberships = JSON.parse(fs.readFileSync(COMMITTEE_SOURCE, 'utf-8'));
  let updated = 0, skipped = 0;

  for (const [bioguideId, committees] of Object.entries(memberships)) {
    if (!repMap.has(bioguideId)) { skipped++; continue; }
    const rep = repMap.get(bioguideId);
    rep.committees = committees.map(c => ({
      code: c.code,
      name: c.name,
      role: c.role || 'Member',
      leadership: (c.role === 'Chairman' || c.role === 'Ranking Member')
    }));
    updated++;
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(reps, null, 2));
  console.log(`Committees updated for ${updated} representatives (skipped ${skipped})`);
})();
