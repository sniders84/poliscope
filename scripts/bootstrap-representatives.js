// scripts/bootstrap-representatives.js
// Purpose: Generate baseline representatives-rankings.json from local legislators-current.json
// Filters for current Representatives and initializes clean schema (no amendments, no votes)
// Merges photo field from housereps.json

const fs = require('fs');
const path = require('path');

const ROSTER_PATH = path.join(process.cwd(), 'public', 'legislators-current.json');
const INFO_PATH   = path.join(process.cwd(), 'public', 'housereps.json');
const OUT_PATH    = path.join(process.cwd(), 'public', 'representatives-rankings.json');

const roster = JSON.parse(fs.readFileSync(ROSTER_PATH, 'utf-8'));
const repsInfo = JSON.parse(fs.readFileSync(INFO_PATH, 'utf-8'));

function makeSlug(rep) {
  if (rep.id && rep.id.bioguide) return rep.id.bioguide.toLowerCase();
  const fullName = `${rep.name.first} ${rep.name.last}`.trim();
  return fullName
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase();
}

function baseRecord(rep) {
  const lastTerm = rep.terms.at(-1);
  const slug = makeSlug(rep);

  // Find matching entry in housereps.json
  const infoMatch = repsInfo.find(i => i.slug === slug || i.bioguideId === rep.id.bioguide);

  return {
    slug,
    bioguideId: rep.id.bioguide,
    name: `${rep.name.first} ${rep.name.last}`,
    state: lastTerm.state,
    district: lastTerm.district || '',
    party: lastTerm.party,
    office: 'Representative',
    photo: infoMatch ? infoMatch.photo : null,
    sponsoredBills: 0,
    cosponsoredBills: 0,
    becameLawBills: 0,
    becameLawCosponsoredBills: 0,
    committees: [],
    misconductCount: 0,
    misconductTags: [],
    yeaVotes: 0,
    nayVotes: 0,
    missedVotes: 0,
    totalVotes: 0,
    participationPct: 0,
    missedVotePct: 0,
    streak: 0,
    powerScore: 0,
    lastUpdated: new Date().toISOString()
  };
}

const reps = roster
  .filter(r => {
    const t = r.terms.at(-1);
    return t.type === 'rep' && new Date(t.end) > new Date();
  })
  .map(baseRecord);

fs.writeFileSync(OUT_PATH, JSON.stringify(reps, null, 2));
console.log(`Bootstrapped representatives-rankings.json with ${reps.length} current Representatives`);
