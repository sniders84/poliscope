// scripts/merge-senators.js
// Purpose: Merge legislation, committees, votes, and misconduct into senators-rankings.json

const fs = require('fs');
const path = require('path');

const RANKINGS_PATH = path.join(__dirname, '..', 'public', 'senators-rankings.json');
const LEGISLATION_PATH = path.join(__dirname, '..', 'public', 'legislation-senators.json');
const COMMITTEES_PATH = path.join(__dirname, '..', 'public', 'senators-committees.json');
const VOTES_PATH = path.join(__dirname, '..', 'public', 'senators-votes.json'); // ✅ corrected filename
const MISCONDUCT_PATH = path.join(__dirname, '..', 'public', 'misconduct-senators.json');

const rankings = JSON.parse(fs.readFileSync(RANKINGS_PATH, 'utf-8'));
const legislation = JSON.parse(fs.readFileSync(LEGISLATION_PATH, 'utf-8'));
const committees = JSON.parse(fs.readFileSync(COMMITTEES_PATH, 'utf-8'));
const votes = JSON.parse(fs.readFileSync(VOTES_PATH, 'utf-8'));

let misconduct = [];
if (fs.existsSync(MISCONDUCT_PATH)) {
  misconduct = JSON.parse(fs.readFileSync(MISCONDUCT_PATH, 'utf-8'));
  console.log(`Loaded misconduct data for ${misconduct.length} senators`);
} else {
  console.log('misconduct-senators.json not found — misconduct remains empty');
}

// Index helpers
const legislationMap = Object.fromEntries(legislation.map(l => [l.bioguideId, l]));
const committeesMap = Object.fromEntries(committees.map(c => [c.bioguideId, c]));
const votesMap = Object.fromEntries(votes.map(v => [v.bioguideId, v]));
const misconductMap = Object.fromEntries(misconduct.map(m => [m.bioguideId, m]));

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

  // Votes (nested schema)
  if (votesMap[id]) {
    sen.votes = votesMap[id].votes || {
      yeaVotes: 0,
      nayVotes: 0,
      missedVotes: 0,
      totalVotes: 0,
      participationPct: 0,
      missedVotePct: 0
    };
  } else {
    sen.votes = {
      yeaVotes: 0,
      nayVotes: 0,
      missedVotes: 0,
      totalVotes: 0,
      participationPct: 0,
      missedVotePct: 0
    };
  }

  // Misconduct
  if (misconductMap[id]) {
    sen.misconductCount = misconductMap[id].misconductCount;
    sen.misconductTags = misconductMap[id].misconductTags;
  } else {
    sen.misconductCount = 0;
    sen.misconductTags = [];
  }

  return sen;
});

fs.writeFileSync(RANKINGS_PATH, JSON.stringify(merged, null, 2));
console.log(`Finished merge: ${merged.length} senators updated in senators-rankings.json`);
