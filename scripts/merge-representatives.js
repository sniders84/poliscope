// scripts/merge-representatives.js
// Purpose: Merge legislation, committees, votes, misconduct, and streaks into representatives-rankings.json

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Paths
const INFO_PATH        = path.join(__dirname, '..', 'public', 'housereps.json'); // ✅ baseline info with photos
const RANKINGS_PATH    = path.join(__dirname, '..', 'public', 'representatives-rankings.json');
const LEGISLATION_PATH = path.join(__dirname, '..', 'public', 'representatives-legislation.json'); // ✅ corrected filename
const COMMITTEES_PATH  = path.join(__dirname, '..', 'public', 'reps-committees.json');
const VOTES_PATH       = path.join(__dirname, '..', 'public', 'representatives-votes.json');       // ✅ corrected filename
const MISCONDUCT_PATH  = path.join(__dirname, '..', 'public', 'misconduct.yaml');
const STREAKS_PATH     = path.join(__dirname, '..', 'public', 'streaks-reps.json');

// Load inputs
const info        = JSON.parse(fs.readFileSync(INFO_PATH, 'utf-8'));
const rankings    = JSON.parse(fs.readFileSync(RANKINGS_PATH, 'utf-8'));
const legislation = JSON.parse(fs.readFileSync(LEGISLATION_PATH, 'utf-8'));
const committees  = JSON.parse(fs.readFileSync(COMMITTEES_PATH, 'utf-8'));
const votes       = JSON.parse(fs.readFileSync(VOTES_PATH, 'utf-8'));

let misconduct = [];
if (fs.existsSync(MISCONDUCT_PATH)) {
  try {
    const raw = fs.readFileSync(MISCONDUCT_PATH, 'utf-8');
    misconduct = yaml.load(raw) || [];
    console.log(`Loaded misconduct.yaml entries: ${Array.isArray(misconduct) ? misconduct.length : 0}`);
  } catch (e) {
    console.warn('Failed to parse misconduct.yaml — proceeding without misconduct data:', e.message);
    misconduct = [];
  }
} else {
  console.log('misconduct.yaml not found — misconduct remains empty');
}

let streaks = [];
if (fs.existsSync(STREAKS_PATH)) {
  streaks = JSON.parse(fs.readFileSync(STREAKS_PATH, 'utf-8'));
  console.log(`Loaded streak data for ${streaks.length} representatives`);
} else {
  console.log('streaks-reps.json not found — streaks remain empty');
}

// Index helpers
const infoMap        = Object.fromEntries(info.map(r => [r.bioguideId, r]));
const legislationMap = Object.fromEntries(legislation.map(l => [l.bioguideId, l]));
const committeesMap  = Object.fromEntries(committees.map(c => [c.bioguideId, c]));
const votesMap       = Object.fromEntries(votes.map(v => [v.bioguideId, v]));
const misconductMap  = Object.fromEntries((Array.isArray(misconduct) ? misconduct : []).map(m => [m.bioguideId, m]));
const streaksMap     = Object.fromEntries(streaks.map(s => [s.bioguideId, s]));

// Merge
const merged = rankings.map(rep => {
  const id = rep.bioguideId;

  // ✅ Preserve baseline info (including photo)
  if (infoMap[id]) {
    rep.name     = infoMap[id].name;
    rep.state    = infoMap[id].state;
    rep.district = infoMap[id].district;
    rep.party    = infoMap[id].party;
    rep.office   = infoMap[id].office;
    rep.photo    = infoMap[id].photo || rep.photo || null; // always preserve photo
  }

  // Legislation
  if (legislationMap[id]) {
    rep.sponsoredBills            = legislationMap[id].sponsoredBills || 0;
    rep.cosponsoredBills          = legislationMap[id].cosponsoredBills || 0;
    rep
