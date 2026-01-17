// Original: Senate scores script
const fs = require('fs');
const path = require('path');

const sensPath = path.join(__dirname, '../public/senators-rankings.json');
const sens = JSON.parse(fs.readFileSync(sensPath));

for (const sen of sens) {
  // Pull raw counts from rankings JSON
  const sponsored = sen.sponsoredBills || 0;
  const cosponsored = sen.cosponsoredBills || 0;
  const amendments = sen.amendments || 0;
  const votes = sen.votes || 0;

  // Raw totals
  sen.totalActivity = sponsored + cosponsored + amendments + votes;

  // Individual metrics
  sen.sponsoredScore = sponsored;
  sen.cosponsoredScore = cosponsored;
  sen.amendmentScore = amendments;
  sen.voteScore = votes;

  // Composite score (example: sum of all activity)
  sen.compositeScore = sen.totalActivity;
}

fs.writeFileSync(
  path.join(__dirname, '../public/senators-scores.json'),
  JSON.stringify(sens, null, 2)
);
console.log('Generated Senate scores with composite activity metrics');
