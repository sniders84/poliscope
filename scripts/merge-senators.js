// scripts/merge-senators.js
// Purpose: Merge all Senate data sources into senators-rankings.json
// Handles empty/truncated JSON files, object-vs-array formats, and preserves streaks

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const senatorsPath     = path.join(__dirname, '../public/senators.json');
const rankingsPath     = path.join(__dirname, '../public/senators-rankings.json');
const legislationPath  = path.join(__dirname, '../public/legislation-senators.json');
const committeesPath   = path.join(__dirname, '../public/senators-committee-membership-current.json');
const votesPath        = path.join(__dirname, '../public/senators-votes.json');
const misconductPath   = path.join(__dirname, '../public/misconduct.yaml');
const streaksPath      = path.join(__dirname, '../public/senators-streaks.json');

console.log('Starting merge-senators.js');

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

// ---------- LOAD FILES ----------
const senators    = safeLoadJSON(senatorsPath, []);
console.log(`Loaded senators.json → ${senators.length} items`);

let rankings      = safeLoadJSON(rankingsPath, []);
console.log(`Loaded senators-rankings.json → ${rankings.length} items`);

const legislation = safeLoadJSON(legislationPath, []);
console.log(`Loaded legislation-senators.json → ${legislation.length} items`);

const committeesRaw = safeLoadJSON(committeesPath, {});
console.log(`Loaded senators-committee-membership-current.json`);

const votesRaw   = safeLoadJSON(votesPath, {});
console.log(`Loaded senators-votes.json`);

const misconduct  = yaml.load(fs.readFileSync(misconductPath, 'utf-8'));
console.log(`Loaded misconduct.yaml → ${misconduct.length} entries`);

const streaksRaw  = safeLoadJSON(streaksPath, {});
console.log(`Loaded senators-streaks.json`);

// ---------- NORMALIZE STRUCTURES ----------
function buildCommitteesMap(committeesObj) {
  const map = {};
  for (const [committeeCode, members] of Object.entries(committeesObj)) {
    for (const m of members) {
      const id = m.bioguide;
      if (!map[id]) map[id] = { committees: [] };
      map[id].committees.push({
        committeeCode,
        committeeName: committeeCode,
        role: m.title || 'Member',
        rank: m.rank,
        party: m.party
      });
    }
  }
  return map;
}

const committeesMap = buildCommitteesMap(committeesRaw);

const votesMap = Array.isArray(votesRaw)
  ? Object.fromEntries(votesRaw.map(v => [v.bioguideId, v.votes]))
  : Object.fromEntries(Object.values(votesRaw).map(v => [v.bioguideId, v.votes]));

const streaksMap = Array.isArray(streaksRaw)
  ? Object.fromEntries(streaksRaw.map(s => [s.bioguideId, s]))
  : streaksRaw;

const legislationMap = Object.fromEntries(
  legislation.map(l => [l.bioguideID || l.bioguideId, l])
);

const misconductMap = Object.fromEntries(
  misconduct.map(m => [m.bioguideId, m])
);

// ---------- MERGE ----------
console.log(`Merging data into ${rankings.length} senators...`);

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
    streaks: {
      activity: str.activity || 0,
      voting: str.voting || 0,
      leader: str.leader || 0
    },
    streak: Math.max(str.activity || 0, str.voting || 0, str.leader || 0),

    lastUpdated: new Date().toISOString()
  };
});

// ---------- WRITE OUTPUT ----------
fs.writeFileSync(rankingsPath, JSON.stringify(rankings, null, 2));
console.log(`Updated senators-rankings.json with merged data (${rankings.length} records)`);
