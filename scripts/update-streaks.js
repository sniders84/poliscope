// scripts/update-streaks.js
// Purpose: Update activity, voting, and leader streaks based on weekly deltas and current rankings

const fs = require('fs');
const path = require('path');

const RANKINGS_PATH = path.join(__dirname, '..', 'public', 'senators-rankings.json');

// Load rankings
let rankings;
try {
  rankings = JSON.parse(fs.readFileSync(RANKINGS_PATH, 'utf-8'));
} catch (err) {
  console.error('Failed to load senators-rankings.json:', err.message);
  process.exit(1);
}

// Helper: safe number
const num = v => (typeof v === 'number' && !Number.isNaN(v)) ? v : 0;

// Determine current leader by powerScore
const sortedByPower = [...rankings].sort((a, b) => num(b.powerScore) - num(a.powerScore));
const leaderBioguide = sortedByPower[0]?.bioguideId || null;

// Update streaks
let updated = 0;
for (const sen of rankings) {
  // Ensure containers exist
  sen.streaks = sen.streaks || { activity: 0, voting: 0, leader: 0 };
  sen.metrics = sen.metrics || { lastTotals: {} };
  const last = sen.metrics.lastTotals || {};

  // Current totals
  const sponsored = num(sen.sponsoredBills);
  const cosponsored = num(sen.cosponsoredBills);
  const yea = num(sen.yeaVotes);
  const nay = num(sen.nayVotes);
  const missed = num(sen.missedVotes);
  const total = num(sen.totalVotes);

  // Previous snapshot
  const prevSponsored = num(last.sponsoredBills);
  const prevCosponsored = num(last.cosponsoredBills);
  const prevYea = num(last.yeaVotes);
  const prevNay = num(last.nayVotes);
  const prevMissed = num(last.missedVotes);
  const prevTotal = num(last.totalVotes);

  // ---- Activity streak: any new sponsored or cosponsored items since last snapshot ----
  const newActivity =
    (sponsored > prevSponsored) ||
    (cosponsored > prevCosponsored);

  if (newActivity) {
    sen.streaks.activity += 1;
  } else {
    sen.streaks.activity = 0;
  }

  // ---- Voting streak: participated in all new roll calls since last snapshot ----
  const newTotalVotes = total - prevTotal;
  const newMissedVotes = missed - prevMissed;

  if (newTotalVotes > 0 && newMissedVotes === 0) {
    sen.streaks.voting += 1;
  } else if (newTotalVotes > 0 && newMissedVotes > 0) {
    sen.streaks.voting = 0;
  }
  // If no new votes, leave voting streak unchanged

  // ---- Leader streak: #1 by powerScore this run ----
  if (leaderBioguide && sen.bioguideId === leaderBioguide) {
    sen.streaks.leader += 1;
  } else {
    sen.streaks.leader = 0;
  }

  // Legacy field: keep as the max of the three for backward compatibility
  sen.streak = Math.max(
    num(sen.streaks.activity),
    num(sen.streaks.voting),
    num(sen.streaks.leader)
  );

  // Update snapshot to current totals for next run
  sen.metrics.lastTotals = {
    sponsoredBills: sponsored,
    cosponsoredBills: cosponsored,
    yeaVotes: yea,
    nayVotes: nay,
    missedVotes: missed,
    totalVotes: total
  };

  sen.lastUpdated = new Date().toISOString();
  updated++;
}

// Write back
fs.writeFileSync(RANKINGS_PATH, JSON.stringify(rankings, null, 2));
console.log(`Streaks updated for ${updated} senators`);
