// Original: House scores script
const fs = require('fs');
const path = require('path');

const repsPath = path.join(__dirname, '../public/representatives-rankings.json');
const reps = JSON.parse(fs.readFileSync(repsPath));

for (const rep of reps) {
  // Pull raw counts from rankings JSON
  const sponsored = rep.sponsoredBills || 0;
  const cosponsored = rep.cosponsoredBills || 0;
  const amendments = rep.amendments || 0;
  const votes = rep.votes || 0;

  // Raw totals
  rep.totalActivity = sponsored + cosponsored + amendments + votes;

  // Individual metrics
  rep.sponsoredScore = sponsored;
  rep.cosponsoredScore = cosponsored;
  rep.amendmentScore = amendments;
  rep.voteScore = votes;

  // Composite score (example: sum of all activity)
  rep.compositeScore = rep.totalActivity;
}

fs.writeFileSync(
  path.join(__dirname, '../public/representatives-scores.json'),
  JSON.stringify(reps, null, 2)
);
console.log('Generated House scores with composite activity metrics');
