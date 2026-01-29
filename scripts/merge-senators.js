// scripts/merge-senators.js
// Purpose: Merge legislation, committees, votes, misconduct, and streaks into senators-rankings.json

const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

// Paths
const INFO_PATH        = path.join(__dirname, "..", "public", "senators.json");
const RANKINGS_PATH    = path.join(__dirname, "..", "public", "senators-rankings.json");
const LEGISLATION_PATH = path.join(__dirname, "..", "public", "senators-legislation.json");
const COMMITTEES_PATH  = path.join(__dirname, "..", "public", "senators-committees.json");
const VOTES_PATH       = path.join(__dirname, "..", "public", "senators-votes.json");
const MISCONDUCT_PATH  = path.join(__dirname, "..", "public", "misconduct.yaml");
const STREAKS_PATH     = path.join(__dirname, "..", "public", "senators-streaks.json");

// Safe JSON loader
function safeLoadJSON(filePath, fallback = []) {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    const raw = fs.readFileSync(filePath, "utf8").trim();
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    console.warn(`Failed to parse ${path.basename(filePath)} — using fallback:`, e.message);
    return fallback;
  }
}

// Load inputs
const senatorsInfo = safeLoadJSON(INFO_PATH, []);
const legislation  = safeLoadJSON(LEGISLATION_PATH, []);
const committees   = safeLoadJSON(COMMITTEES_PATH, []);
const votes        = safeLoadJSON(VOTES_PATH, []);
const streaks      = safeLoadJSON(STREAKS_PATH, []);

let misconduct = [];
if (fs.existsSync(MISCONDUCT_PATH)) {
  try {
    const raw = fs.readFileSync(MISCONDUCT_PATH, "utf8");
    misconduct = yaml.load(raw) || [];
    console.log(`Loaded misconduct.yaml entries: ${Array.isArray(misconduct) ? misconduct.length : 0}`);
  } catch (e) {
    console.warn("Failed to parse misconduct.yaml — proceeding without misconduct data:", e.message);
    misconduct = [];
  }
} else {
  console.log("misconduct.yaml not found — misconduct remains empty");
}

// Index helpers
const legislationMap = Object.fromEntries(legislation.map(l => [l.bioguideId, l]));
const committeesMap  = Object.fromEntries(committees.map(c => [c.bioguideId, c]));
const votesMap       = Object.fromEntries(votes.map(v => [v.bioguideId, v]));
const misconductMap  = Object.fromEntries((Array.isArray(misconduct) ? misconduct : []).map(m => [m.bioguideId, m]));
const streaksMap     = Object.fromEntries(streaks.map(s => [s.bioguideId, s]));

// Merge everything into rankings
const rankings = senatorsInfo.map(info => {
  const id = info.bioguideId;

  const record = {
    slug: info.slug,
    bioguideId: id,
    govtrackId: info.govtrackId,
    name: info.name,
    state: info.state,
    district: info.district,
    party: info.party,
    office: info.office,
    photo: info.photo || null,

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
    streaks: { activity: 0, voting: 0, leader: 0 },
    metrics: { lastTotals: {} },
    streak: 0,
    powerScore: 0,
    lastUpdated: new Date().toISOString(),
  };

  // Legislation
  if (legislationMap[id]) {
    record.sponsoredBills            = legislationMap[id].sponsoredBills || 0;
    record.cosponsoredBills          = legislationMap[id].cosponsoredBills || 0;
    record.becameLawBills            = legislationMap[id].becameLawBills || 0;
    record.becameLawCosponsoredBills = legislationMap[id].becameLawCosponsoredBills || 0;
  }

  // Committees
  if (committeesMap[id]) {
    record.committees = committeesMap[id].committees || [];
  }

  // Votes
  if (votesMap[id]) {
    record.yeaVotes         = votesMap[id].yeaVotes || 0;
    record.nayVotes         = votesMap[id].nayVotes || 0;
    record.missedVotes      = votesMap[id].missedVotes || 0;
    record.totalVotes       = votesMap[id].totalVotes || 0;
    record.participationPct = votesMap[id].participationPct || 0;
    record.missedVotePct    = votesMap[id].missedVotePct || 0;
  }

  // Misconduct
  if (misconductMap[id]) {
    record.misconductCount = misconductMap[id].misconductCount ?? 0;
    record.misconductTags  = misconductMap[id].misconductTags ?? [];
  }

  // Streaks
  if (streaksMap[id]) {
    record.streaks = streaksMap[id].streaks || { activity: 0, voting: 0, leader: 0 };
    record.streak  = streaksMap[id].streak || 0;
  }

  // Metrics snapshot
  record.metrics.lastTotals = {
    sponsoredBills: record.sponsoredBills,
    cosponsoredBills: record.cosponsoredBills,
    yeaVotes: record.yeaVotes,
    nayVotes: record.nayVotes,
    missedVotes: record.missedVotes,
    totalVotes: record.totalVotes
  };

  return record;
});

// Write merged rankings
fs.writeFileSync(RANKINGS_PATH, JSON.stringify(rankings, null, 2));
console.log(`Finished merge: ${rankings.length} senators updated in senators-rankings.json`);
