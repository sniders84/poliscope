// scripts/update-streaks-senators.js
// Purpose: Update activity, voting, and leader streaks for Senators
// Mirrors the Representatives version exactly, but for Senate files

const fs = require('fs');
const path = require('path');

const RANKINGS_PATH = path.join(__dirname, '..', 'public', 'senators-rankings.json');
const STREAKS_PATH = path.join(__dirname, '..', 'public', 'senators-streaks.json');

function num(v) {
  return (typeof v === 'number' && !Number.isNaN(v)) ? v : 0;
}

function ensureSchema(sen) {
  sen.sponsoredBills ??= 0;
  sen.cosponsoredBills ??= 0;
  sen.becameLawBills ??= 0;
  sen.becameLawCosponsoredBills ??= 0;

  sen.yeaVotes ??= 0;
  sen.nayVotes ??= 0;
  sen.missedVotes ??= 0;
  sen.totalVotes ??= 0;

  sen.streaks = sen.streaks || { activity: 0, voting: 0, leader: 0 };
  sen.metrics = sen.metrics || { lastTotals: {} };

  return sen;
}

(function main() {
  let rankings;
  try {
    rankings = JSON.parse(fs.readFileSync(RANKINGS_PATH, 'utf-8')).map(ensureSchema);
  } catch (err) {
    console.error(`Failed to load Senators file: ${err.message}`);
    process.exit(1);
  }

  const sortedByPower = [...rankings].sort((a, b) => num(b.powerScore) - num(a.powerScore));
  const leaderBioguide = sortedByPower[0]?.bioguideId || null;

  let updated = 0;
  const streaksOutput = [];

  for (const person of rankings) {
    const last = person.metrics.lastTotals || {};

    const sponsored = num(person.sponsoredBills);
    const cosponsored = num(person.cosponsoredBills);
    const yea = num(person.yeaVotes);
    const nay = num(person.nayVotes);
    const missed = num(person.missedVotes);
    const total = num(person.totalVotes);

    const prevSponsored = num(last.sponsoredBills);
    const prevCosponsored = num(last.cosponsoredBills);
    const prevMissed = num(last.missedVotes);
    const prevTotal = num(last.totalVotes);

    // Activity streak
    const newActivity = (sponsored > prevSponsored) || (cosponsored > prevCosponsored);
    person.streaks.activity = newActivity ? person.streaks.activity + 1 : 0;

    // Voting streak
    const newTotalVotes = total - prevTotal;
    const newMissedVotes = missed - prevMissed;
    if (newTotalVotes > 0 && newMissedVotes === 0) {
      person.streaks.voting += 1;
    } else if (newTotalVotes > 0 && newMissedVotes > 0) {
      person.streaks.voting = 0;
    }

    // Leader streak
    if (leaderBioguide && person.bioguideId === leaderBioguide) {
      person.streaks.leader += 1;
    } else {
      person.streaks.leader = 0;
    }

    // Legacy field
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

  fs.writeFileSync(RANKINGS_PATH, JSON.stringify(rankings, null, 2));
  fs.writeFileSync(STREAKS_PATH, JSON.stringify(streaksOutput, null, 2));
  console.log(`Streaks updated for ${updated} Senators`);
})();
