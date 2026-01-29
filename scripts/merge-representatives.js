// scripts/merge-representatives.js
// Purpose: Merge legislation, committees, votes, misconduct, and streaks 
//          into representatives-rankings.json (the main enriched output)

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// ────────────────────────────────────────────────
// File paths (all relative to project root via ..)
const BASE_DIR = path.join(__dirname, '..', 'public');

const PATHS = {
  INFO:        path.join(BASE_DIR, 'housereps.json'),               // baseline + photos
  RANKINGS:    path.join(BASE_DIR, 'representatives-rankings.json'), // main output / base
  LEGISLATION: path.join(BASE_DIR, 'representatives-legislation.json'),
  COMMITTEES:  path.join(BASE_DIR, 'representatives-committees.json'),   // ← corrected name
  VOTES:       path.join(BASE_DIR, 'representatives-votes.json'),
  MISCONDUCT:  path.join(BASE_DIR, 'misconduct.yaml'),
  STREAKS:     path.join(BASE_DIR, 'representatives-streaks.json'),
};

// ────────────────────────────────────────────────
// Helper: safe JSON load with fallback
function safeJsonLoad(filePath, fallback = []) {
  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${path.basename(filePath)} → using empty/default`);
    return fallback;
  }
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    console.log(`Loaded ${path.basename(filePath)} → ${Array.isArray(data) ? data.length : 'object'} items`);
    return data;
  } catch (err) {
    console.error(`Failed to parse ${path.basename(filePath)}: ${err.message}`);
    return fallback;
  }
}

// Helper: safe YAML load (misconduct)
function safeYamlLoad(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${path.basename(filePath)} → misconduct empty`);
    return [];
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = yaml.load(raw) || [];
    console.log(`Loaded misconduct.yaml → ${Array.isArray(data) ? data.length : 0} entries`);
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn(`Failed to parse misconduct.yaml: ${err.message} → skipping misconduct`);
    return [];
  }
}

// ────────────────────────────────────────────────
// Load all data sources
const info        = safeJsonLoad(PATHS.INFO,        []);
const rankings    = safeJsonLoad(PATHS.RANKINGS,    []);
const legislation = safeJsonLoad(PATHS.LEGISLATION, []);
const committees  = safeJsonLoad(PATHS.COMMITTEES,  []);
const votes       = safeJsonLoad(PATHS.VOTES,       []);
const misconduct  = safeYamlLoad(PATHS.MISCONDUCT);
const streaks     = safeJsonLoad(PATHS.STREAKS,     []);

// Early exit if we have nothing to merge into
if (!Array.isArray(rankings) || rankings.length === 0) {
  console.error('No valid representatives found in rankings file. Aborting.');
  process.exit(1);
}

console.log(`Merging data into ${rankings.length} representatives...`);

// ────────────────────────────────────────────────
// Create lookup maps (bioguideId → data)
const infoMap        = Object.fromEntries(info.map(r => [r.bioguideId, r]));
const legislationMap = Object.fromEntries(legislation.map(l => [l.bioguideId, l]));
const committeesMap  = Object.fromEntries(committees.map(c => [c.bioguideId, c]));
const votesMap       = Object.fromEntries(votes.map(v => [v.bioguideId, v]));
const misconductMap  = Object.fromEntries(misconduct.map(m => [m.bioguideId, m]));
const streaksMap     = Object.fromEntries(streaks.map(s => [s.bioguideId, s]));

// ────────────────────────────────────────────────
// Merge loop
const merged = rankings.map(rep => {
  const id = rep.bioguideId;
  if (!id) {
    console.warn('Representative missing bioguideId → skipping enrichment');
    return rep;
  }

  // 1. Baseline info (name, state, party, photo, etc.)
  const base = infoMap[id];
  if (base) {
    rep.name     = base.name     || rep.name;
    rep.state    = base.state    || rep.state;
    rep.district = base.district || rep.district;
    rep.party    = base.party    || rep.party;
    rep.office   = base.office   || rep.office;
    rep.photo    = base.photo    || rep.photo || null;
  }

  // 2. Legislation counts
  const leg = legislationMap[id];
  if (leg) {
    rep.sponsoredBills            = leg.sponsoredBills            ?? 0;
    rep.cosponsoredBills          = leg.cosponsoredBills          ?? 0;
    rep.becameLawBills            = leg.becameLawBills            ?? 0;
    rep.becameLawCosponsoredBills = leg.becameLawCosponsoredBills ?? 0;
  }

  // 3. Committees (array)
  const comm = committeesMap[id];
  if (comm) {
    rep.committees = Array.isArray(comm.committees) ? comm.committees : [];
  }

  // 4. Voting record
  const vote = votesMap[id];
  rep.yeaVotes         = vote?.yeaVotes         ?? 0;
  rep.nayVotes         = vote?.nayVotes         ?? 0;
  rep.missedVotes      = vote?.missedVotes      ?? 0;
  rep.totalVotes       = vote?.totalVotes       ?? 0;
  rep.participationPct = vote?.participationPct ?? 0;
  rep.missedVotePct    = vote?.missedVotePct    ?? 0;

  // 5. Misconduct
  const misconductData = misconductMap[id];
  rep.misconductCount = misconductData?.misconductCount ?? 0;
  rep.misconductTags  = Array.isArray(misconductData?.misconductTags)
    ? misconductData.misconductTags
    : [];

  // 6. Streaks
  const streakData = streaksMap[id];
  if (streakData) {
    rep.streaks = {
      activity: streakData.streaks?.activity ?? 0,
      voting:   streakData.streaks?.voting   ?? 0,
      leader:   streakData.streaks?.leader   ?? 0,
    };
    rep.streak = streakData.streak ?? 0;
  } else {
    // Preserve if already present, otherwise default
    rep.streaks = rep.streaks || { activity: 0, voting: 0, leader: 0 };
    rep.streak  = rep.streak  ?? 0;
  }

  // 7. Metrics snapshot (for change tracking / history)
  rep.metrics = rep.metrics || { lastTotals: {} };
  rep.metrics.lastTotals = {
    sponsoredBills:            rep.sponsoredBills            ?? 0,
    cosponsoredBills:          rep.cosponsoredBills          ?? 0,
    yeaVotes:                  rep.yeaVotes                  ?? 0,
    nayVotes:                  rep.nayVotes                  ?? 0,
    missedVotes:               rep.missedVotes               ?? 0,
    totalVotes:                rep.totalVotes                ?? 0,
  };

  rep.lastUpdated = new Date().toISOString();

  return rep;
});

// ────────────────────────────────────────────────
// Write result
fs.writeFileSync(PATHS.RANKINGS, JSON.stringify(merged, null, 2), 'utf-8');

console.log(`Merge complete: ${merged.length} representatives written to ${path.basename(PATHS.RANKINGS)}`);