// scripts/merge-representatives.js
// Purpose: Merge legislation, committees, votes, misconduct, and streaks into representatives-rankings.json

const fs = require('fs');
const path = require('path');

const RANKINGS_PATH = path.join(__dirname, '..', 'public', 'representatives-rankings.json');
const LEGISLATION_PATH = path.join(__dirname, '..', 'public', 'legislation-reps.json');
const COMMITTEES_PATH = path.join(__dirname, '..', 'public', 'reps-committees.json');
const VOTES_PATH = path.join(__dirname, '..', 'public', 'votes-reps.json');
const MISCONDUCT_PATH = path.join(__dirname, '..', 'public', 'misconduct-reps.json');
const STREAKS_PATH = path.join(__dirname, '..', 'public', 'streaks-reps.json');

const rankings = JSON.parse(fs.readFileSync(RANKINGS_PATH, 'utf-8'));
const legislation = JSON.parse(fs.readFileSync(LEGISLATION_PATH, 'utf-8'));
const committees = JSON.parse(fs.readFileSync(COMMITTEES_PATH, 'utf-8'));
const votes = JSON.parse(fs.readFileSync(VOTES_PATH, 'utf-8'));

let misconduct = [];
if (fs.existsSync(MISCONDUCT_PATH)) {
  misconduct = JSON.parse(fs.readFileSync(MISCONDUCT_PATH, 'utf-8'));
  console.log(`Loaded misconduct data for ${misconduct.length} representatives`);
} else {
  console.log('misconduct-reps.json not found — misconduct remains empty');
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
const committeesMap = Object.fromEntries(committees.map(c => [c.bioguideId, c]));
const votesMap = Object.fromEntries(votes.map(v => [v.bioguideId, v]));
const misconductMap = Object.fromEntries(misconduct.map(m => [m.bioguideId, m]));
const streaksMap = Object.fromEntries(streaks.map(s => [s.bioguideId, s]));

// Merge
const merged = rankings.map(rep => {
  const id = rep.bioguideId;

  // Legislation
  if (legislationMap[id]) {
    Object.assign(rep, {
      sponsoredBills: legislationMap[id].sponsoredBills,
      cosponsoredBills: legislationMap[id].cosponsoredBills,
      becameLawBills: legislationMap[id].becameLawBills,
      becameLawCosponsoredBills: legislationMap[id].becameLawCosponsoredBills
    });
  }

  // Committees
  if (committeesMap[id]) {
    rep.committees = committeesMap[id].committees || [];
  }

  // Votes
  if (votesMap[id]) {
    Object.assign(rep, {
      yeaVotes: votesMap[id].yeaVotes,
      nayVotes: votesMap[id].nayVotes,
      missedVotes: votesMap[id].missedVotes,
      totalVotes: votesMap[id].totalVotes,
      participationPct: votesMap[id].participationPct,
      missedVotePct: votesMap[id].missedVotePct
    });
  }

  // Misconduct
  if (misconductMap[id]) {
    rep.misconductCount = misconductMap[id].misconductCount;
    rep.misconductTags = misconductMap[id].misconductTags;
  } else {
    rep.misconductCount = 0;
    rep.misconductTags = [];
  }

  // Streaks
  if (streaksMap[id]) {
    rep.streak = streaksMap[id].streak;
  } else {
    rep.streak = 0;
  }

  return rep;
});

fs.writeFileSync(RANKINGS_PATH, JSON.stringify(merged, null, 2));
console.log(`Finished merge: ${merged.length} representatives updated in representatives-rankings.json`);
