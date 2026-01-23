// scripts/bootstrap-senators.js
// Purpose: Generate baseline senators-rankings.json from local legislators-current.json
// Filters for current Senators and initializes clean schema (no amendments, no votes)
// Merges photo field from senators.json

const fs = require('fs');
const path = require('path');

const ROSTER_PATH = path.join(process.cwd(), 'poliscope', 'public', 'legislators-current.json');
const INFO_PATH = path.join(process.cwd(), 'poliscope', 'public', 'senators.json');
const OUT_PATH = path.join(process.cwd(), 'poliscope', 'public', 'senators-rankings.json');

const roster = JSON.parse(fs.readFileSync(ROSTER_PATH, 'utf-8'));
const sensInfo = JSON.parse(fs.readFileSync(INFO_PATH, 'utf-8'));

function makeSlug(sen) {
  if (sen.id && sen.id.bioguide) return sen.id.bioguide.toLowerCase();
  const fullName = `${sen.name.first} ${sen.name.last}`.trim();
  return fullName
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase();
}

function baseRecord(sen) {
  const lastTerm = sen.terms.at(-1);
  const slug = makeSlug(sen);

  // Find matching entry in senators.json
  const infoMatch = sensInfo.find(i => i.slug === slug || i.bioguideId === sen.id.bioguide);

  return {
    slug,
    bioguideId: sen.id.bioguide,
    name: `${sen.name.first} ${sen.name.last}`,
    state: lastTerm.state,
    district: 'At-Large',
    party: lastTerm.party,
    office: 'Senator',
    photo: infoMatch ? infoMatch.photo : null, // merged photo from senators.json
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

const sens = roster
  .filter(r => {
    const t = r.terms.at(-1);
    return t.type === 'sen' && new Date(t.end) > new Date();
  })
  .map(baseRecord);

fs.writeFileSync(OUT_PATH, JSON.stringify(sens, null, 2));
console.log(`Bootstrapped senators-rankings.json with ${sens.length} current Senators`);
