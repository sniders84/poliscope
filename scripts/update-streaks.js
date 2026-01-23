// scripts/update-streaks.js
// Purpose: Update activity, voting, and leader streaks for Senators and Representatives
// Compares current totals against last snapshot and increments/resets streaks

const fs = require('fs');
const path = require('path');

const FILES = [
  { label: 'Senators', path: path.join(__dirname, '..', 'public', 'senators-rankings.json') },
  { label: 'Representatives', path: path.join(__dirname, '..', 'public', 'representatives-rankings.json') }
];

function num(v) {
  return (typeof v === 'number' && !Number.isNaN(v)) ? v : 0;
}

function updateFile(filePath, label) {
  let rankings;
  try {
    rankings = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (err) {
    console.error(`Failed to load ${label} file:`, err.message);
    return;
  }

  // Determine current leader by powerScore
  const sortedByPower = [...rankings].sort((a, b) => num(b.powerScore) - num(a.powerScore));
  const leaderBioguide = sortedByPower[0]?.bioguideId || null;

  let updated = 0;
  for (const person of rankings) {
    person.streaks = person.streaks || { activity: 0, voting: 0, leader: 0 };
    person.metrics = person.metrics || { lastTotals: {} };
    const last = person.metrics.lastTotals || {};

    // Current totals
    const sponsored = num(person.sponsoredBills);
    const cosponsored = num(person.cosponsoredBills);
    const yea = num(person.yeaVotes);
    const nay = num(person.nayVotes);
    const missed = num(person.missedVotes);
    const total = num(person.totalVotes);

    // Previous snapshot
    const prevSponsored = num(last.sponsoredBills);
    const prevCosponsored = num(last.cosponsoredBills);
    const prevYea = num(last.yeaVotes);
    const prevNay = num(last.nayVotes);
    const prevMissed = num(last.missedVotes);
    const prevTotal = num(last.totalVotes);

    // ---- Activity streak ----
    const newActivity =
      (sponsored > prevSponsored) ||
      (cosponsored > prevCosponsored);

    if (newActivity) {
      person.streaks.activity += 1;
    } else {
      person.streaks.activity = 0;
    }

    // ---- Voting streak ----
    const newTotalVotes = total - prevTotal;
    const newMissedVotes = missed - prevMissed;

    if (newTotalVotes > 0 && newMissedVotes === 0) {
      person.streaks.voting += 1;
    } else if (newTotalVotes > 0 && newMissedVotes > 0) {
      person.streaks.voting = 0;
    }
    // If no new votes, leave voting streak unchanged

    // ---- Leader streak ----
    if (leaderBioguide && person.bioguideId === leaderBioguide) {
      person.streaks.leader += 1;
    } else {
      person.streaks.leader = 0;
    }

    // Legacy field: max of the three
    person.streak = Math.max(
      num(person.streaks.activity),
      num(person.streaks.voting),
      num(person.streaks.leader)
    );

    // Update snapshot
    person.metrics.lastTotals = {
      sponsoredBills: sponsored,
      cosponsoredBills: cosponsored,
      yeaVotes: yea,
      nayVotes: nay,
      missedVotes: missed,
      totalVotes: total
    };

    person.lastUpdated = new Date().toISOString();
    updated++;
  }

  fs.writeFileSync(filePath, JSON.stringify(rankings, null, 2));
  console.log(`Streaks updated for ${updated} ${label}`);
}

// Run for both Senators and Representatives
FILES.forEach(f => updateFile(f.path, f.label));
