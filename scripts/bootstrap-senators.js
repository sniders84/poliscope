// scripts/bootstrap-senators.js
// Purpose: Generate baseline senators-rankings.json from legislators-current.json
// Filters for current Senators and initializes clean schema
// Merges photo field from senators.json by GovTrack ID

const fs = require('fs');
const path = require('path');

const ROSTER_PATH = path.join(process.cwd(), 'public', 'legislators-current.json');
const INFO_PATH   = path.join(process.cwd(), 'public', 'senators.json');
const OUT_PATH    = path.join(process.cwd(), 'public', 'senators-rankings.json');

const roster = JSON.parse(fs.readFileSync(ROSTER_PATH, 'utf-8'));
const sensInfo = JSON.parse(fs.readFileSync(INFO_PATH, 'utf-8'));

function extractGovtrackId(link) {
  const match = link.match(/members\/(\d+)/);
  return match ? match[1] : null;
}

// Build a map of govtrackId → photo
const sensPhotoMap = {};
sensInfo.forEach(i => {
  const id = extractGovtrackId(i.govtrackLink);
  if (id) sensPhotoMap[id] = i.photo;
});

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
  const govtrackId = sen.id.govtrack.toString();

  return {
    slug,
    bioguideId: sen.id.bioguide,
    govtrackId,
    name: `${sen.name.first} ${sen.name.last}`,
    state: lastTerm.state,
    district: 'At-Large',
    party: lastTerm.party,
    office: 'Senator',
    photo: sensPhotoMap[govtrackId] || null, // ✅ merge by GovTrack ID
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
console.log('Sample record:', sens[0]);
