// scripts/misconduct-scraper.js
// Purpose: Parse GovTrack misconduct.yaml and attach misconduct fields to rankings.json
// Works for both Senate and House depending on target file

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const LEGISLATORS_PATH = path.join(__dirname, '../public/legislators-current.json');
const MISCONDUCT_PATH = path.join(__dirname, '../public/misconduct.yaml');

const arg = (process.env.CHAMBER || process.argv[2] || 'senate').toLowerCase();
let target;
if (arg.startsWith('sen')) {
  target = 'senate';
} else if (arg.startsWith('rep') || arg.startsWith('house')) {
  target = 'house';
} else {
  console.warn(`Unknown chamber "${arg}", defaulting to senate`);
  target = 'senate';
}

const RANKINGS_PATH = path.join(
  __dirname,
  `../public/${target === 'house' ? 'representatives' : 'senators'}-rankings.json`
);

console.log(`Running misconduct-scraper.js for ${target}...`);

function ensureSchema(rec) {
  rec.yeaVotes ??= 0;
  rec.nayVotes ??= 0;
  rec.missedVotes ??= 0;
  rec.totalVotes ??= 0;
  rec.participationPct ??= 0;
  rec.missedVotePct ??= 0;

  rec.sponsoredBills ??= 0;
  rec.cosponsoredBills ??= 0;
  rec.becameLawBills ??= 0;
  rec.becameLawCosponsoredBills ??= 0;

  rec.committees = Array.isArray(rec.committees) ? rec.committees : [];

  rec.rawScore ??= 0;
  rec.score ??= 0;
  rec.scoreNormalized ??= 0;

  rec.misconductCount ??= 0;
  rec.misconductTags ??= [];
  rec.misconductTexts ??= [];
  rec.misconductAllegations ??= [];
  rec.misconductConsequences ??= [];

  return rec;
}

let legislators, misconduct, rankings;
try {
  legislators = JSON.parse(fs.readFileSync(LEGISLATORS_PATH, 'utf-8'));
  misconduct = yaml.load(fs.readFileSync(MISCONDUCT_PATH, 'utf-8')) || [];
  rankings = JSON.parse(fs.readFileSync(RANKINGS_PATH, 'utf-8')).map(ensureSchema);
} catch (err) {
  console.error('Failed to load input files:', err.message);
  process.exit(1);
}

const govtrackMap = new Map();
for (const leg of legislators) {
  const bio = leg.id?.bioguide;
  const gov = leg.id?.govtrack;
  if (bio && gov) govtrackMap.set(gov, bio);
}

const misconductMap = new Map();
for (const entry of misconduct) {
  const govId = entry.person;
  const bio = govtrackMap.get(govId);
  if (!bio) continue;

  const current = misconductMap.get(bio) || {
    count: 0,
    tags: [],
    texts: [],
    allegations: [],
    consequences: []
  };

  current.count += 1;

  if (Array.isArray(entry.tags)) current.tags.push(...entry.tags);
  else if (typeof entry.tags === 'string') current.tags.push(entry.tags);

  if (entry.allegation) current.allegations.push(entry.allegation);
  if (entry.text) current.texts.push(entry.text);
  if (Array.isArray(entry.consequences)) current.consequences.push(...entry.consequences);

  misconductMap.set(bio, current);
}

let updated = 0;
for (const rec of rankings) {
  const data = misconductMap.get(rec.bioguideId);
  if (data) {
    rec.misconductCount = data.count;
    rec.misconductTags = [...new Set(data.tags)];
    rec.misconductTexts = data.texts;
    rec.misconductAllegations = data.allegations;
    rec.misconductConsequences = data.consequences;
    updated++;
  }
  rec.lastUpdated = new Date().toISOString();
}

fs.writeFileSync(RANKINGS_PATH, JSON.stringify(rankings, null, 2));
console.log(`Misconduct data merged for ${updated} ${target} records`);
