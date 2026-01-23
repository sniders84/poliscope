// scripts/misconduct-scraper.js
// Purpose: Parse GovTrack misconduct.yaml and attach misconductCount/tags to rankings.json
// Works for both Senate and House depending on target file

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Paths
const LEGISLATORS_PATH = path.join(__dirname, '../public/legislators-current.json');
const MISCONDUCT_PATH = path.join(__dirname, '../public/misconduct.yaml');

// Choose target via env var or CLI arg: "senate" or "house"
const target = process.env.CHAMBER || process.argv[2] || 'senate';
const RANKINGS_PATH = path.join(
  __dirname,
  `../public/${target === 'house' ? 'representatives' : 'senators'}-rankings.json`
);

console.log(`Running misconduct-scraper.js for ${target}...`);

let legislators, misconduct, rankings;
try {
  legislators = JSON.parse(fs.readFileSync(LEGISLATORS_PATH, 'utf-8'));
  misconduct = yaml.load(fs.readFileSync(MISCONDUCT_PATH, 'utf-8'));
  rankings = JSON.parse(fs.readFileSync(RANKINGS_PATH, 'utf-8'));
} catch (err) {
  console.error('Failed to load input files:', err.message);
  process.exit(1);
}

// Build govtrack → bioguide map
const govtrackMap = new Map();
for (const leg of legislators) {
  const bio = leg.id?.bioguide;
  const gov = leg.id?.govtrack;
  if (bio && gov) govtrackMap.set(gov, bio);
}

// Aggregate misconduct counts
const misconductMap = new Map();
for (const entry of misconduct) {
  const govId = entry.person;
  const bio = govtrackMap.get(govId);
  if (!bio) continue;

  const current = misconductMap.get(bio) || { count: 0, tags: [] };
  current.count += 1;
  if (Array.isArray(entry.tags)) {
    current.tags.push(...entry.tags);
  }
  misconductMap.set(bio, current);
}

// Attach to rankings
let updated = 0;
for (const rec of rankings) {
  const data = misconductMap.get(rec.bioguideId);
  if (data) {
    rec.misconductCount = data.count;
    rec.misconductTags = [...new Set(data.tags)];
    updated++;
  } else {
    rec.misconductCount = rec.misconductCount || 0;
    rec.misconductTags = rec.misconductTags || [];
  }
  rec.lastUpdated = new Date().toISOString();
}

fs.writeFileSync(RANKINGS_PATH, JSON.stringify(rankings, null, 2));
console.log(`Misconduct data merged for ${updated} ${target} records`);
