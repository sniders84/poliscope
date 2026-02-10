// scripts/merge-representatives.js
// Purpose: Consolidate House data directly into representatives-rankings.json
// Removes dependency on empty sidecar files like representatives-votes.json

const fs = require('fs');
const path = require('path');

const rankingsPath = path.join(__dirname, '../public/representatives-rankings.json');
const legislationPath = path.join(__dirname, '../public/representatives-legislation.json');
const committeesPath = path.join(__dirname, '../public/representatives-committees.json');
// Add other sources if you still want them for audit, but they’re optional now

function loadJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch (err) {
    console.warn(`Skipping ${file}: ${err.message}`);
    return [];
  }
}

(function main() {
  let reps;
  try {
    reps = JSON.parse(fs.readFileSync(rankingsPath, 'utf-8'));
  } catch (err) {
    console.error(`Failed to read rankings file: ${err.message}`);
    process.exit(1);
  }

  const repMap = new Map(reps.map(r => [r.bioguideId.toUpperCase(), r]));

  // Merge legislation
  const legislation = loadJson(legislationPath);
  for (const l of legislation) {
    const bio = (l.bioguideId || '').toUpperCase();
    if (!bio || !repMap.has(bio)) continue;
    const rep = repMap.get(bio);
    rep.sponsoredBills = l.sponsoredBills ?? rep.sponsoredBills ?? 0;
    rep.cosponsoredBills = l.cosponsoredBills ?? rep.cosponsoredBills ?? 0;
    rep.becameLawBills = l.becameLawBills ?? rep.becameLawBills ?? 0;
    rep.becameLawCosponsoredBills = l.becameLawCosponsoredBills ?? rep.becameLawCosponsoredBills ?? 0;
  }

  // Merge committees
  const committees = loadJson(committeesPath);
  for (const c of committees) {
    const bio = (c.bioguideId || '').toUpperCase();
    if (!bio || !repMap.has(bio)) continue;
    const rep = repMap.get(bio);
    rep.committees = c.committees || rep.committees || [];
  }

  // At this point, votes, misconduct, scores, streaks are already written
  // directly into representatives-rankings.json by their own scripts.
  // No need to parse empty files like representatives-votes.json.

  fs.writeFileSync(rankingsPath, JSON.stringify(Array.from(repMap.values()), null, 2));
  console.log(`Merged House data into ${rankingsPath} (${repMap.size} records)`);
})();
