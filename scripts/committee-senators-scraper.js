// scripts/committee-senators-scraper.js
// Purpose: Attach committee memberships + leadership flags for Senators
// Source: public/senators-committee-membership-current.json (or .yaml)

const fs = require('fs');
const path = require('path');

const OUT_PATH = path.join(__dirname, '..', 'public', 'senators-rankings.json');
const COMMITTEE_SOURCE = path.join(__dirname, '..', 'public', 'senators-committee-membership-current.json');

(function main() {
  const sens = JSON.parse(fs.readFileSync(OUT_PATH, 'utf-8'));
  const senMap = new Map(sens.map(r => [r.bioguideId, r]));

  if (!fs.existsSync(COMMITTEE_SOURCE)) {
    console.log('No senators-committee-membership-current.json found; skipping committees');
    fs.writeFileSync(OUT_PATH, JSON.stringify(sens, null, 2));
    return;
  }

  const memberships = JSON.parse(fs.readFileSync(COMMITTEE_SOURCE, 'utf-8'));
  let updated = 0, skipped = 0;

  for (const [bioguideId, committees] of Object.entries(memberships)) {
    if (!senMap.has(bioguideId)) { skipped++; continue; }
    const sen = senMap.get(bioguideId);
    sen.committees = committees.map(c => ({
      code: c.code,
      name: c.name,
      role: c.role || 'Member',
      leadership: (c.role === 'Chairman' || c.role === 'Ranking Member')
    }));
    updated++;
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(sens, null, 2));
  console.log(`Committees updated for ${updated} senators (skipped ${skipped})`);
})();
