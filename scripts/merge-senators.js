// scripts/merge-senators.js
// Purpose: Merge legislation, committees, votes, and misconduct into senators-rankings.json

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const RANKINGS_PATH = path.join(__dirname, '..', 'public', 'senators-rankings.json');
const LEGISLATION_PATH = path.join(__dirname, '..', 'public', 'legislation-senators.json');
const COMMITTEES_PATH = path.join(__dirname, '..', 'public', 'senators-committees.json');
const VOTES_PATH = path.join(__dirname, '..', 'public', 'senators-votes.json'); // ✅ correct filename
const MISCONDUCT_PATH = path.join(__dirname, '..', 'public', 'misconduct.yaml'); // ✅ YAML source

// Load inputs
const rankings = JSON.parse(fs.readFileSync(RANKINGS_PATH, 'utf-8'));
const legislation = JSON.parse(fs.readFileSync(LEGISLATION_PATH, 'utf-8'));
const committees = JSON.parse(fs.readFileSync(COMMITTEES_PATH, 'utf-8'));
const votes = JSON.parse(fs.readFileSync(VOTES_PATH, 'utf-8'));

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

// Index helpers
const legislationMap = Object.fromEntries(legislation.map(l => [l.bioguideId, l]));
const committeesMap = Object.fromEntries(committees.map(c => [c.bioguideId, c]));
const votesMap = Object.fromEntries(votes.map(v => [v.bioguideId, v]));
// Expect misconduct YAML entries to include bioguideId + tags/count
const misconductMap = Object.fromEntries(
  (Array.isArray(misconduct) ? misconduct : []).map(m => [m.bioguideId, m])
);

// Merge
const merged = rankings.map(sen => {
  const id = sen.bioguideId;

  // Legislation
  if (legislationMap[id]) {
    Object.assign(sen, {
      sponsoredBills: legislationMap[id].sponsoredBills,
      cosponsoredBills: legislationMap[id].cosponsoredBills,
      becameLawBills: legislationMap[id].becameLawBills,
      becameLawCosponsoredBills: legislationMap[id].becameLawCosponsoredBills
    });
  }

  // Committees
  if (committeesMap[id]) {
    sen.committees = committeesMap[id].committees || [];
  }

  // Votes (flatten to top-level fields per your schema)
  if (votesMap[id]) {
    const v = votesMap[id].votes || {};
    sen.yeaVotes = v.yeaVotes ?? 0;
    sen.nayVotes = v.nayVotes ?? 0;
    sen.missedVotes = v.missedVotes ?? 0;
    sen.totalVotes = v.totalVotes ?? (sen.yeaVotes + sen.nayVotes + sen.missedVotes);
    sen.participationPct = v.participationPct ?? (sen.totalVotes ? +(((sen.yeaVotes + sen.nayVotes) / sen.totalVotes) * 100).toFixed(2) : 0);
    sen.missedVotePct = v.missedVotePct ?? (sen.totalVotes ? +((sen.missedVotes / sen.totalVotes) * 100).toFixed(2) : 0);
  } else {
    sen.yeaVotes = 0;
    sen.nayVotes = 0;
    sen.missedVotes = 0;
    sen.totalVotes = 0;
    sen.participationPct = 0;
    sen.missedVotePct = 0;
  }

  // Misconduct (from YAML)
  if (misconductMap[id]) {
    sen.misconductCount = misconductMap[id].misconductCount ?? 0;
    sen.misconductTags = misconductMap[id].misconductTags ?? [];
  } else {
    sen.misconductCount = 0;
    sen.misconductTags = [];
  }

  // Preserve existing fields like streak, powerScore, lastUpdated if present
  sen.lastUpdated = new Date().toISOString();

  return sen;
});

fs.writeFileSync(RANKINGS_PATH, JSON.stringify(merged, null, 2));
console.log(`Finished merge: ${merged.length} senators updated in senators-rankings.json`);
