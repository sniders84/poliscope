// scripts/committee-reps-scraper.js
// Purpose: Update committees for House members (top-level only), quiet skip logs

const fs = require('fs');
const path = require('path');

const OUT_PATH = path.join(__dirname, '..', 'public', 'representatives-rankings.json');

(function main() {
  const reps = JSON.parse(fs.readFileSync(OUT_PATH, 'utf-8'));
  const repMap = new Map(reps.map(r => [r.bioguideId, r]));

  let updated = 0;
  let skipped = 0;

  const COMMITTEE_SOURCE = path.join(__dirname, '..', 'public', 'house-committees.json');
  if (!fs.existsSync(COMMITTEE_SOURCE)) {
    console.log('No house-committees.json found; skipping committees');
    fs.writeFileSync(OUT_PATH, JSON.stringify(reps, null, 2));
    return;
  }
  const memberships = JSON.parse(fs.readFileSync(COMMITTEE_SOURCE, 'utf-8'));

  for (const [bioguideId, committees] of Object.entries(memberships)) {
    if (!repMap.has(bioguideId)) { skipped++; continue; }
    const rep = repMap.get(bioguideId);
    rep.committees = committees.filter(c => c.topLevel).map(c => ({
      code: c.code,
      name: c.name,
      role: c.role || 'Member',
      leadership: !!c.leadership
    }));
    updated++;
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(reps, null, 2));
  console.log(`Committees updated for ${updated} representatives (skipped ${skipped})`);
})();
