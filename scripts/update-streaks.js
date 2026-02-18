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
    if (newMissed <= 1) {           // allow 0–1 miss per update
      person.streaks.voting += 1;
    } else {
      person.streaks.voting = 0;
    }
  }
  // no new votes → preserve streak (quiet day)

  // Leader: replace top-power logic with actual leadership list
  const isLeader = [
    'J000299', // Mike Johnson (Speaker)
    'S001176', // Steve Scalise
    'E000294', // Tom Emmer
    'M001136', // Lisa McClain
    'J000294', // Hakeem Jeffries
    'C001101'  // Katherine Clark
    // add more if you want committee chairs
  ].includes(person.bioguideId);

  person.streaks.leader = isLeader ? person.streaks.leader + 1 : 0;

  // Legacy streak
  person.streak = Math.max(
    person.streaks.activity,
    person.streaks.voting,
    person.streaks.leader
  );

  // Save current as next baseline
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
