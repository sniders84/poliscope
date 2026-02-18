// scripts/update-streaks.js
const fs = require('fs');
const path = require('path');

function num(v) {
  return (typeof v === 'number' && !Number.isNaN(v)) ? v : 0;
}

function ensureSchema(person) {
  person.sponsoredBills ??= 0;
  person.cosponsoredBills ??= 0;
  person.becameLawBills ??= 0;
  person.becameLawCosponsoredBills ??= 0;

  person.yeaVotes ??= 0;
  person.nayVotes ??= 0;
  person.missedVotes ??= 0;
  person.totalVotes ??= 0;

  person.streaks = person.streaks || { activity: 0, voting: 0, leader: 0 };
  person.metrics = person.metrics || { lastTotals: {} };

  return person;
}

function loadJSONSafe(p, fallback) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch {
    return fallback;
  }
}

function updateChamberStreaks(opts) {
  const {
    rankingsPath,
    prevRankingsPath,
    streaksPath,
    leaderIds
  } = opts;

  let rankings = loadJSONSafe(rankingsPath, []).map(ensureSchema);
  const prevRankings = loadJSONSafe(prevRankingsPath, []);

  const prevById = new Map(
    prevRankings
      .map(ensureSchema)
      .map(p => [p.bioguideId || p.bioguide, p])
  );

  const streaksOutput = [];
  let updated = 0;

  for (const person of rankings) {
    const id = person.bioguideId || person.bioguide;
    const prev = prevById.get(id) || {};
    const last = prev.metrics?.lastTotals || {
      sponsoredBills: 0,
      cosponsoredBills: 0,
      yeaVotes: 0,
      nayVotes: 0,
      missedVotes: 0,
      totalVotes: 0
    };

    const sponsored   = num(person.sponsoredBills);
    const cosponsored = num(person.cosponsoredBills);
    const yea         = num(person.yeaVotes);
    const nay         = num(person.nayVotes);
    const missed      = num(person.missedVotes);
    const total       = num(person.totalVotes);

    const prevSponsored   = num(last.sponsoredBills);
    const prevCosponsored = num(last.cosponsoredBills);
    const prevYea         = num(last.yeaVotes);
    const prevNay         = num(last.nayVotes);
    const prevMissed      = num(last.missedVotes);
    const prevTotal       = num(last.totalVotes);

    const hadBillChange = sponsored > prevSponsored || cosponsored > prevCosponsored;
    const hadVoteChange = (yea + nay) > (prevYea + prevNay);
    person.streaks.activity = (hadBillChange || hadVoteChange)
      ? person.streaks.activity + 1
      : 0;

    const newTotal = total - prevTotal;
    const newMissed = missed - prevMissed;
    if (newTotal > 0) {
      if (newMissed <= 1) {
        person.streaks.voting += 1;
      } else {
        person.streaks.voting = 0;
      }
    }

    const isLeader = leaderIds.includes(person.bioguideId);
    person.streaks.leader = isLeader ? person.streaks.leader + 1 : 0;

    person.streak = Math.max(
      person.streaks.activity,
      person.streaks.voting,
      person.streaks.leader
    );

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

  fs.writeFileSync(rankingsPath, JSON.stringify(rankings, null, 2));
  fs.writeFileSync(streaksPath, JSON.stringify(streaksOutput, null, 2));
  fs.writeFileSync(prevRankingsPath, JSON.stringify(rankings, null, 2));

  console.log(`Streaks updated for ${updated} entries from ${path.basename(rankingsPath)}`);
}

(function main() {
  const base = path.join(__dirname, '..', 'public');

  updateChamberStreaks({
    rankingsPath: path.join(base, 'senators-rankings.json'),
    prevRankingsPath: path.join(base, 'senators-rankings-prev.json'),
    streaksPath: path.join(base, 'senators-streaks.json'),
    leaderIds: [
      'T000250', // John Thune
      'B001261', // John Barrasso
      'S000063'  // Chuck Schumer
    ]
  });

  updateChamberStreaks({
    rankingsPath: path.join(base, 'representatives-rankings.json'),
    prevRankingsPath: path.join(base, 'representatives-rankings-prev.json'),
    streaksPath: path.join(base, 'representatives-streaks.json'),
    leaderIds: [
      'J000299', // Mike Johnson
      'S001176', // Steve Scalise
      'E000294', // Tom Emmer
      'M001136', // Lisa McClain
      'J000294', // Hakeem Jeffries
      'C001101'  // Katherine Clark
    ]
  });
})();
