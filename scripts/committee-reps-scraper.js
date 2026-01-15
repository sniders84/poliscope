// scripts/committee-reps-scraper.js
// Purpose: Merge House committee memberships (with leadership flags) into representatives-rankings.json

const fs = require('fs');
const path = require('path');

const OUT_PATH = path.join(__dirname, '..', 'public', 'representatives-rankings.json');
// Input file: House committees membership data
const COMMITTEES_PATH = path.join(__dirname, '..', 'public', 'house-committees-current.json');

function ensureRepShape(rep) {
  return {
    name: rep.name,
    bioguideId: rep.bioguideId,
    state: rep.state,
    party: rep.party,
    office: rep.office || 'Representative',
    sponsoredBills: rep.sponsoredBills || 0,
    cosponsoredBills: rep.cosponsoredBills || 0,
    sponsoredAmendments: rep.sponsoredAmendments || 0,
    cosponsoredAmendments: rep.cosponsoredAmendments || 0,
    yeaVotes: rep.yeaVotes || 0,
    nayVotes: rep.nayVotes || 0,
    missedVotes: rep.missedVotes || 0,
    totalVotes: rep.totalVotes || 0,
    committees: Array.isArray(rep.committees) ? rep.committees : [],
    participationPct: rep.participationPct || 0,
    missedVotePct: rep.missedVotePct || 0,
    rawScore: rep.rawScore || 0,
    scoreNormalized: rep.scoreNormalized || 0,
  };
}

function indexByBioguide(list) {
  const map = new Map();
  list.forEach(r => {
    if (r.bioguideId) map.set(r.bioguideId, r);
  });
  return map;
}

(function main() {
  const reps = JSON.parse(fs.readFileSync(OUT_PATH, 'utf-8')).map(ensureRepShape);

  let committees;
  try {
    committees = JSON.parse(fs.readFileSync(COMMITTEES_PATH, 'utf-8'));
  } catch (e) {
    console.error('Failed to load input files:', e.message);
    process.exit(1);
  }

  // Normalize: if it's not an array, turn it into one
  const committeeArray = Array.isArray(committees)
    ? committees
    : Object.entries(committees).map(([code, data]) => ({
        code,
        name: data.name,
        members: data.members || []
      }));

  const repMap = indexByBioguide(reps);

  committeeArray.forEach(c => {
    const members = Array.isArray(c.members) ? c.members : [];
    members.forEach(m => {
      const rep = repMap.get(m.bioguideId);
      if (!rep) return;
      const entry = {
        committeeCode: c.code || null,
        committeeName: c.name || null,
        role: m.role || 'Member',
      };
      // Avoid duplicates
      const exists = rep.committees.some(
        x => x.committeeCode === entry.committeeCode && x.role === entry.role
      );
      if (!exists) rep.committees.push(entry);
    });
  });

  const updated = reps.map(r => ensureRepShape(repMap.get(r.bioguideId) || r));
  fs.writeFileSync(OUT_PATH, JSON.stringify(updated, null, 2));
  console.log(`Updated committees for ${updated.length} representatives`);
})();
