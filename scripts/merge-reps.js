const fs = require('fs');
const path = require('path');

const REPS_PATH = path.join(__dirname, '../public/representatives-rankings.json');

function run() {
  const reps = JSON.parse(fs.readFileSync(REPS_PATH, 'utf8'));

  reps.forEach(rep => {
    if (rep.totalVotes > 0) {
      rep.participationPct = ((rep.yeaVotes + rep.nayVotes) / rep.totalVotes * 100).toFixed(2);
      rep.missedVotePct = ((rep.missedVotes / rep.totalVotes) * 100).toFixed(2);
    } else {
      rep.participationPct = 0;
      rep.missedVotePct = 0;
    }
  });

  fs.writeFileSync(REPS_PATH, JSON.stringify(reps, null, 2));
  console.log(`Merge complete: ${reps.length} representatives total`);
}

run();
