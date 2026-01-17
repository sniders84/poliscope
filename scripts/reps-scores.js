// Full replacement: House scores for 119th Congress
const fs = require('fs');
const path = require('path');

const repsPath = path.join(__dirname, '../public/representatives-rankings.json');
const reps = JSON.parse(fs.readFileSync(repsPath));

for (const rep of reps) {
  // Leadership quality = sponsored bills in 119th Congress
  rep.leadershipQuality = rep.sponsoredBills119 || 0;
  // Follower quality = cosponsored bills in 119th Congress
  rep.followerQuality = rep.cosponsoredBills119 || 0;
}

fs.writeFileSync(
  path.join(__dirname, '../public/representatives-scores.json'),
  JSON.stringify(reps, null, 2)
);
console.log('Generated House scores (leadership/follower counts only)');
