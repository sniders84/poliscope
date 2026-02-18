// scripts/update-streaks.js
const fs = require('fs');
const path = require('path');

const RANKINGS_PATH = path.join(__dirname, '..', 'public', 'representatives-rankings.json');
const STREAKS_PATH = path.join(__dirname, '..', 'public', 'representatives-streaks.json');

function num(v) {
  return (typeof v === 'number' && !Number.isNaN(v)) ? v : 0;
}

function ensureSchema(rep) {
  rep.sponsoredBills ??= 0;
  rep.cosponsoredBills ??= 0;
  rep.becameLawBills ??= 0;
  rep.becameLawCosponsoredBills ??= 0;

  rep.yeaVotes ??= 0;
  rep.nayVotes ??= 0;
  rep.missedVotes ??= 0;
  rep.totalVotes ??= 0;

  rep.streaks = rep.streaks || { activity: 0, voting: 0, leader: 0 };
  rep.metrics = rep.metrics || { lastTotals: {} };

  return rep;
}

(function main() {
  let rankings;
  try {
    rankings = JSON.parse(fs.readFileSync(RANKINGS_PATH, 'utf-8')).map(ensureSchema);
  } catch (err) {
    console.error(`Failed to load Representatives file: ${err.message}`);
    process.exit(1);
  }

  let updated = 0;
  const streaksOutput = [];

  for (const person of rankings) {
    const last = person.metrics.lastTotals || {
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

    // Activity: any new bill or vote action
    const hadBillChange = sponsored > prevSponsored || cosponsored > prevCosponsored;
    const hadVoteChange = (yea + nay) > (prevYea + prevNay);
    person.streaks.activity = (hadBillChange || hadVoteChange)
      ? person.streaks.activity + 1
      : 0;

    // Voting: reset only if missed increased when votes were cast
    const newTotal = total - prevTotal;
    const newMissed = missed - prevMissed;
    if (newTotal > 0) {
      if (newMissed <= 1) {
        person.streaks.voting += 1;
      } else {
        person.streaks.voting = 0;
      }
    }

    // Leader: hardcoded House leadership
    const isLeader = [
      'J000299', // Mike Johnson
      'S001176', // Steve Scalise
      'E000294', // Tom Emmer
      'M001136', // Lisa McClain
      'J000294', // Hakeem Jeffries
      'C001101'  // Katherine Clark
    ].includes(person.bioguideId);

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

  fs.writeFileSync(RANKINGS_PATH, JSON.stringify(rankings, null, 2));
  fs.writeFileSync(STREAKS_PATH, JSON.stringify(streaksOutput, null, 2));
  console.log(`Streaks updated for ${updated} Representatives`);
})();
