// scripts/committee-reps-scraper.js
// Purpose: Merge House committee memberships (with leadership flags) into representatives-rankings.json

const fs = require('fs');
const path = require('path');

const OUT_PATH = path.join(__dirname, '..', 'public', 'representatives-rankings.json');
const COMMITTEES_PATH = path.join(__dirname, '..', 'public', 'house-committees-current.json');

function ensureSchema(rep) {
  // Votes
  rep.yeaVotes ??= 0;
  rep.nayVotes ??= 0;
  rep.missedVotes ??= 0;
  rep.totalVotes ??= 0;
  rep.participationPct ??= 0;
  rep.missedVotePct ??= 0;

  // Legislation
  rep.sponsoredBills ??= 0;
  rep.cosponsoredBills ??= 0;
  rep.sponsoredAmendments ??= 0;
  rep.cosponsoredAmendments ??= 0;
  rep.becameLawBills ??= 0;
  rep.becameLawCosponsoredBills ??= 0;
  rep.becameLawAmendments ??= 0;
  rep.becameLawCosponsoredAmendments ??= 0;

  // Committees
  rep.committees = Array.isArray(rep.committees) ? rep.committees : [];

  // Scores
  rep.rawScore ??= 0;
  rep.score ??= 0;
  rep.scoreNormalized ??= 0;

  return rep;
}

(function main() {
  const reps = JSON.parse(fs.readFileSync(OUT_PATH, 'utf-8')).map(ensureSchema);
  const committeesDataRaw = JSON.parse(fs.readFileSync(COMMITTEES_PATH, 'utf-8'));

  const repMap = new Map(reps.map(r => [r.bioguideId, r]));

  // committeesDataRaw is an object keyed by committee code, each value is an array of members
  for (const [committeeCode, members] of Object.entries(committeesDataRaw)) {
    if (!Array.isArray(members)) continue;

    for (const m of members) {
      const bio = m.bioguide;
      if (!bio || !repMap.has(bio)) continue;

      const rep = repMap.get(bio);

      // Normalize role
      let role = 'Member';
      if (m.title) {
        const t = m.title.toLowerCase();
        if (t.includes('chairman') || t.includes('chair')) {
          role = 'Chair';
        } else if (t.includes('ranking')) {
          role = 'Ranking Member';
        } else {
          role = m.title;
        }
      }

      const entry = {
        committeeCode,
        committeeName: m.committeeName || committeeCode,
        role,
        rank: m.rank ?? null,
        party: m.party || null
      };

      // Avoid duplicates: same committee + same role
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
