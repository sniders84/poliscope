const fs = require('fs');
const path = require('path');

const REPS_PATH = path.join(__dirname, '../public/representatives-rankings.json');

function run() {
  const reps = JSON.parse(fs.readFileSync(REPS_PATH, 'utf8'));

  reps.forEach(rep => {
    const raw = rep.sponsoredBills + rep.cosponsoredBills + rep.sponsoredAmendments + rep.cosponsoredAmendments + rep.yeaVotes + rep.nayVotes;
    rep.rawScore = raw;
    rep.scoreNormalized = rep.totalVotes > 0 ? ((raw / rep.totalVotes) * 100).toFixed(2) : 0;
  });

  fs.writeFileSync(REPS_PATH, JSON.stringify(reps, null, 2));
  console.log(`Scored ${reps.length} representatives`);
}

run();
