// scripts/committee-scraper.js
// Purpose: Update committees for Senators (top-level only), quiet skip logs

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const OUT_PATH = path.join(__dirname, '..', 'public', 'senators-rankings.json');

(async function main() {
  const sens = JSON.parse(fs.readFileSync(OUT_PATH, 'utf-8'));
  const senMap = new Map(sens.map(r => [r.bioguideId, r]));

  let updated = 0;
  let skipped = 0;

  // Replace with your existing source logic; here’s a conservative placeholder:
  // Assume you have a JSON of committee memberships keyed by bioguideId
  const COMMITTEE_SOURCE = path.join(__dirname, '..', 'public', 'senate-committees.json');
  if (!fs.existsSync(COMMITTEE_SOURCE)) {
    console.log('No senate-committees.json found; skipping committees');
    fs.writeFileSync(OUT_PATH, JSON.stringify(sens, null, 2));
    return;
  }
  const memberships = JSON.parse(fs.readFileSync(COMMITTEE_SOURCE, 'utf-8'));

  for (const [bioguideId, committees] of Object.entries(memberships)) {
    if (!senMap.has(bioguideId)) { skipped++; continue; }
    const sen = senMap.get(bioguideId);
    sen.committees = committees.filter(c => c.topLevel).map(c => ({
      code: c.code,
      name: c.name,
      role: c.role || 'Member',
      leadership: !!c.leadership
    }));
    updated++;
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(sens, null, 2));
  console.log(`Committees updated for ${updated} senators (skipped ${skipped})`);
})();
