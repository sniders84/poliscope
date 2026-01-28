// scripts/merge-representatives.js
// Purpose: Merge legislation, committees, votes, misconduct, and streaks into representatives-rankings.json

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const RANKINGS_PATH    = path.join(__dirname, '..', 'public', 'representatives-rankings.json');
const LEGISLATION_PATH = path.join(__dirname, '..', 'public', 'legislation-reps.json');
const COMMITTEES_PATH  = path.join(__dirname, '..', 'public', 'reps-committees.json');
const VOTES_PATH       = path.join(__dirname, '..', 'public', 'votes-reps.json');
const MISCONDUCT_PATH  = path.join(__dirname, '..', 'public', 'misconduct.yaml'); // ✅ unified YAML source
const STREAKS_PATH     = path.join(__dirname, '..', 'public', 'streaks-reps.json');

// Load inputs
const rankings   = JSON.parse(fs.readFileSync(RANKINGS_PATH, 'utf-8'));
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
const legislationMap = Object.fromEntries(legislation.map(l => [l.bioguideId, l]));
const committeesMap  = Object.fromEntries(committees.map(c => [c.bioguideId, c]));
const votesMap       = Object.fromEntries(votes.map(v => [v.bioguideId, v]));
const misconductMap  = Object.fromEntries((Array.isArray(misconduct) ? misconduct : []).map(m => [m.bioguideId, m]));
const streaksMap     = Object.fromEntries(streaks.map(s => [s.bioguideId, s]));

// Merge
const merged = rankings.map(rep => {
  const id = rep.bioguideId;

  // Legislation
  if (legislationMap[id]) {
    rep.sponsoredBills            = legislationMap[id].sponsoredBills;
    rep.cosponsoredBills          = legislationMap[id].cosponsoredBills;
    rep.becameLawBills            = legislationMap[id].becameLawBills;
    rep.becameLawCosponsoredBills = legislationMap[id].becameLawCosponsoredBills;
  }

  // Committees
  if (committeesMap[id]) {
    rep.committees = committeesMap[id].committees || [];
  }

  // Votes
  if (votesMap[id]) {
    rep.yeaVotes        = votesMap[id].yeaVotes;
    rep.nayVotes        = votesMap[id].nayVotes;
    rep.missedVotes     = votesMap[id].missedVotes;
    rep.totalVotes      = votesMap[id].totalVotes;
    rep.participationPct = votesMap[id].participationPct;
    rep.missedVotePct    = votesMap[id].missedVotePct;
  } else {
    rep.yeaVotes = 0;
    rep.nayVotes = 0;
    rep.missedVotes = 0;
    rep.totalVotes = 0;
    rep.participationPct = 0;
    rep.missedVotePct = 0;
  }

  // Misconduct (from YAML)
  if (misconductMap[id]) {
    rep.misconductCount = misconductMap[id].misconductCount ?? 0;
    rep.misconductTags  = misconductMap[id].misconductTags ?? [];
  } else {
    rep.misconductCount = 0;
    rep.misconductTags  = [];
  }

  // Streaks
  if (streaksMap[id]) {
    rep.streaks = streaksMap[id].streaks || { activity: 0, voting: 0, leader: 0 };
    rep.streak  = streaksMap[id].streak || 0;
  } else {
    rep.streaks = rep.streaks || { activity: 0, voting: 0, leader: 0 };
    rep.streak  = rep.streak || 0;
  }

  // Ensure metrics snapshot exists and update with current totals
  rep.metrics = rep.metrics || { lastTotals: {} };
  rep.metrics.lastTotals = {
    sponsoredBills: rep.sponsoredBills || 0,
    cosponsoredBills: rep.cosponsoredBills || 0,
    yeaVotes: rep.yeaVotes || 0,
    nayVotes: rep.nayVotes || 0,
    missedVotes: rep.missedVotes || 0,
    totalVotes: rep.totalVotes || 0
  };

  rep.lastUpdated = new Date().toISOString();
  return rep;
});

fs.writeFileSync(RANKINGS_PATH, JSON.stringify(merged, null, 2));
console.log(`Finished merge: ${merged.length} representatives updated in representatives-rankings.json`);
