// scripts/merge-representatives.js
// Purpose: Merge all House data sources into representatives-rankings.json
// Handles empty/truncated JSON files, object-vs-array formats, and preserves streaks

const fs = require('fs');
const path = require('path');

const repsPath          = path.join(__dirname, '../public/housereps.json');
const rankingsPath      = path.join(__dirname, '../public/representatives-rankings.json');
const legislationPath   = path.join(__dirname, '../public/representatives-legislation.json');
const committeesPath    = path.join(__dirname, '../public/representatives-committees.json');
const votesPath         = path.join(__dirname, '../public/representatives-votes.json');
const misconductPath    = path.join(__dirname, '../public/misconduct.yaml');
const streaksPath       = path.join(__dirname, '../public/representatives-streaks.json');

const yaml = require('js-yaml');

console.log('Starting merge-representatives.js');

// ---------- SAFE LOADERS ----------
function safeLoadJSON(filePath, fallback) {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8').trim();
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`Failed to parse ${path.basename(filePath)}: ${err.message}`);
    return fallback;
  }
}

function normalizeArray(input) {
  if (Array.isArray(input)) return input;
  if (input && typeof input === 'object') return Object.values(input);
  return [];
}

// ---------- LOAD FILES ----------
const reps        = safeLoadJSON(repsPath, []);
console.log(`Loaded housereps.json → ${reps.length} items`);

let rankings      = safeLoadJSON(rankingsPath, []);
console.log(`Loaded representatives-rankings.json → ${rankings.length} items`);

const legislation = safeLoadJSON(legislationPath, []);
console.log(`Loaded representatives-legislation.json → ${legislation.length} items`);

const committeesRaw = safeLoadJSON(committeesPath, {});
console.log(`Loaded representatives-committees.json → ${Array.isArray(committeesRaw) ? committeesRaw.length : 'object items'}`);

const votesRaw   = safeLoadJSON(votesPath, {});
console.log(`Loaded representatives-votes.json`);

const misconduct  = yaml.load(fs.readFileSync(misconductPath, 'utf-8'));
console.log(`Loaded misconduct.yaml → ${misconduct.length} entries`);

const streaksRaw  = safeLoadJSON(streaksPath, {});
console.log(`Loaded representatives-streaks.json`);

// ---------- NORMALIZE STRUCTURES ----------
const committeesArr = normalizeArray(committeesRaw);
const committeesMap = Object.fromEntries(
  committeesArr.map(c => [c.bioguideId, c])
);

const votesMap = Array.isArray(votesRaw)
  ? Object.fromEntries(votesRaw.map(v => [v.bioguideId, v]))
  : votesRaw;

const streaksMap = Array.isArray(streaksRaw)
  ? Object.fromEntries(streaksRaw.map(s => [s.bioguideId, s]))
  : streaksRaw;

const legislationMap = Object.fromEntries(
  legislation.map(l => [l.bioguideId, l])
);

const misconductMap = Object.fromEntries(
  misconduct.map(m => [m.bioguideId, m])
);

// ---------- MERGE ----------
console.log(`Merging data into ${rankings.length} representatives...`);

rankings = rankings.map(r => {
  const id = r.bioguideId;

  const leg = legislationMap[id] || {};
  const com = committeesMap[id] || { committees: [] };
  const vot = votesMap[id] || {};
  const mis = misconductMap[id] || {};
  const str = streaksMap[id] || {};

  return {
    ...r,

    // Legislation
    sponsoredBills: leg.sponsoredBills || 0,
    cosponsoredBills: leg.cosponsoredBills || 0,
    becameLawBills: leg.becameLawBills || 0,
    becameLawCosponsoredBills: leg.becameLawCosponsoredBills || 0,

    // Committees
    committees: com.committees || [],

    // Votes
    yeaVotes: vot.yeaVotes || 0,
    nayVotes: vot.nayVotes || 0,
    missedVotes: vot.missedVotes || 0,
    totalVotes: vot.totalVotes || 0,
    participationPct: vot.participationPct || 0,
    missedVotePct: vot.missedVotePct || 0,

    // Misconduct
    misconductCount: mis.count || 0,
    misconductTags: mis.tags || [],

    // Streaks
    streak: str.streak || 0,
    streaks: str.streaks || {},

    lastUpdated: new Date().toISOString()
  };
});

// ---------- WRITE OUTPUT ----------
fs.writeFileSync(rankingsPath, JSON.stringify(rankings, null, 2));
console.log(`Updated representatives-rankings.json with merged data (${rankings.length} records)`);