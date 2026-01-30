// scripts/update-streaks.js
// Purpose: Update activity, voting, and leader streaks for Senators and Representatives
// Ensures streaks.json files are populated and defaults to 0 if missing

const fs = require('fs');
const path = require('path');

const FILES = [
  { label: 'Senators', path: path.join(__dirname, '..', 'public', 'senators-rankings.json'), streakFile: path.join(__dirname, '..', 'public', 'senators-streaks.json') },
  { label: 'Representatives', path: path.join(__dirname, '..', 'public', 'representatives-rankings.json'), streakFile: path.join(__dirname, '..', 'public', 'representatives-streaks.json') }
];

function num(v) {
  return (typeof v === 'number' && !Number.isNaN(v)) ? v : 0;
}

function updateFile(filePath, label, streakFile) {
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
  const streaksOutput = [];

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
    const newActivity = (sponsored > prevSponsored) || (cosponsored > prevCosponsored);
    person.streaks.activity = newActivity ? person.streaks.activity + 1 : 0;

    // ---- Voting streak ----
    const newTotalVotes = total - prevTotal;
    const newMissedVotes = missed - prevMissed;
    if (newTotalVotes > 0 && newMissedVotes === 0) {
      person.streaks.voting += 1;
    } else if (newTotalVotes > 0 && newMissedVotes > 0) {
      person.streaks.voting = 0;
    }

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

    streaksOutput.push({
      bioguideId: person.bioguideId,
      activity: person.streaks.activity,
      voting: person.streaks.voting,
      leader: person.streaks.leader
    });
  }

  fs.writeFileSync(filePath, JSON.stringify(rankings, null, 2));
  fs.writeFileSync(streakFile, JSON.stringify(streaksOutput, null, 2));
  console.log(`Streaks updated for ${updated} ${label}`);
}

// Run for both Senators and Representatives
FILES.forEach(f => updateFile(f.path, f.label, f.streakFile));
