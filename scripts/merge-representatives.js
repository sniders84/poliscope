// scripts/merge-representatives.js
// Purpose: Consolidate House data directly into representatives-rankings.json
// Adds photos from housereps.json, merges legislation + committees

const fs = require('fs');
const path = require('path');

const rankingsPath = path.join(__dirname, '../public/representatives-rankings.json');
const legislationPath = path.join(__dirname, '../public/representatives-legislation.json');
const committeesPath = path.join(__dirname, '../public/representatives-committees.json');
const houserepsPath = path.join(__dirname, '../public/housereps.json');

function loadJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch (err) {
    console.warn(`Skipping ${file}: ${err.message}`);
    return Array.isArray(file) ? [] : {};
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
  if (Array.isArray(legislation)) {
    for (const l of legislation) {
      const bio = (l.bioguideId || '').toUpperCase();
      if (!bio || !repMap.has(bio)) continue;
      const rep = repMap.get(bio);
      rep.sponsoredBills = l.sponsoredBills ?? rep.sponsoredBills ?? 0;
      rep.cosponsoredBills = l.cosponsoredBills ?? rep.cosponsoredBills ?? 0;
      rep.becameLawBills = l.becameLawBills ?? rep.becameLawBills ?? 0;
      rep.becameLawCosponsoredBills = l.becameLawCosponsoredBills ?? rep.becameLawCosponsoredBills ?? 0;
    }
  }

  // Merge committees (object keyed by committee code)
  const committeesRaw = loadJson(committeesPath);
  for (const [code, members] of Object.entries(committeesRaw)) {
    if (!Array.isArray(members)) continue;
    for (const m of members) {
      const bio = (m.bioguide || m.bioguideId || '').toUpperCase();
      if (!bio || !repMap.has(bio)) continue;

      const rep = repMap.get(bio);
      rep.committees = rep.committees || [];

      let role = 'Member';
      if (m.title) {
        const t = m.title.toLowerCase();
        if (t.includes('chair')) role = 'Chair';
        else if (t.includes('ranking')) role = 'Ranking Member';
        else role = m.title;
      }

      rep.committees.push({
        committeeCode: code,
        committeeName: code,
        role,
        rank: m.rank ?? null,
        party: m.party || null
      });
    }
  }

  // Merge photos from housereps.json
  const housereps = loadJson(houserepsPath);
  for (const hr of housereps) {
    const slug = (hr.slug || '').toLowerCase();
    const photo = hr.photo || null;
    if (!photo) continue;

    // Match by slug or name
    for (const [bio, rep] of repMap.entries()) {
      if (rep.slug && rep.slug.toLowerCase() === slug) {
        rep.photo = photo;
      } else if (rep.name && rep.name.toLowerCase() === hr.name.toLowerCase()) {
        rep.photo = photo;
      }
    }
  }

  fs.writeFileSync(rankingsPath, JSON.stringify(Array.from(repMap.values()), null, 2));
  console.log(`Merged House data into ${rankingsPath} (${repMap.size} records)`);
})();
