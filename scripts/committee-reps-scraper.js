// scripts/committee-reps-scraper.js
// Purpose: Merge House committee memberships (with leadership flags) into representatives-rankings.json

const fs = require('fs');
const path = require('path');

const OUT_PATH = path.join(__dirname, '..', 'public', 'representatives-rankings.json');
const COMMITTEES_PATH = path.join(__dirname, '..', 'public', 'representatives-committees.json');

function ensureSchema(rep) {
  rep.yeaVotes ??= 0;
  rep.nayVotes ??= 0;
  rep.missedVotes ??= 0;
  rep.totalVotes ??= 0;
  rep.participationPct ??= 0;
  rep.missedVotePct ??= 0;

  rep.sponsoredBills ??= 0;
  rep.cosponsoredBills ??= 0;
  rep.becameLawBills ??= 0;
  rep.becameLawCosponsoredBills ??= 0;

  rep.committees = Array.isArray(rep.committees) ? rep.committees : [];

  rep.rawScore ??= 0;
  rep.score ??= 0;
  rep.scoreNormalized ??= 0;

  return rep;
}

(function main() {
  let reps;
  try {
    reps = JSON.parse(fs.readFileSync(OUT_PATH, 'utf-8')).map(ensureSchema);
  } catch (err) {
    console.error(`Failed to read rankings file: ${err.message}`);
    process.exit(1);
  }

  let committeesDataRaw;
  try {
    committeesDataRaw = JSON.parse(fs.readFileSync(COMMITTEES_PATH, 'utf-8'));
  } catch (err) {
    console.error(`Failed to read committees file: ${err.message}`);
    process.exit(1);
  }

  const repMap = new Map(reps.map(r => [r.bioguideId, r]));

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
      const bio = m.bioguide;
      if (!bio || !repMap.has(bio)) continue;

      const rep = repMap.get(bio);

      let role = 'Member';
      if (m.title) {
        const t = m.title.toLowerCase();
        if (t.includes('chairman') || t.includes('chair')) {
          role = 'Chair';
        } else if (t.includes('ranking')) {
          role = 'Ranking Member';
        } else if (t.includes('vice')) {
          role = 'Vice Chair';
        } else {
          role = m.title;
        }
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

  fs.writeFileSync(OUT_PATH, JSON.stringify(reps, null, 2));
  console.log(`Updated committees for ${reps.length} representatives`);
})();
