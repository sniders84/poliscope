const fs = require('fs');
const path = require('path');

const REPS_PATH = path.join(__dirname, '../public/representatives-rankings.json');
const VOTES_PATH = path.join(__dirname, '../public/house-votes-current.json');

function run() {
  const reps = JSON.parse(fs.readFileSync(REPS_PATH, 'utf8'));
  const votes = JSON.parse(fs.readFileSync(VOTES_PATH, 'utf8'));

  reps.forEach(rep => {
    rep.yeaVotes = 0;
    rep.nayVotes = 0;
    rep.missedVotes = 0;
    rep.totalVotes = 0;

    const voteArray = Array.isArray(votes) ? votes : Object.values(votes);

    voteArray.forEach(v => {
      const positions = v.positions || v.members || [];
      positions.forEach(pos => {
        if (pos.bioguideId === rep.bioguideId) {
          rep.totalVotes++;
          if (pos.vote === 'Yea') rep.yeaVotes++;
          else if (pos.vote === 'Nay') rep.nayVotes++;
          else rep.missedVotes++;
        }
      });
    });
  });

  fs.writeFileSync(REPS_PATH, JSON.stringify(reps, null, 2));
  console.log(`Updated votes for ${reps.length} representatives`);
}

run();
