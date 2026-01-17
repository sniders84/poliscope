// Full replacement: Senate scores for 119th Congress
const fs = require('fs');
const path = require('path');

const sensPath = path.join(__dirname, '../public/senators-rankings.json');
const sens = JSON.parse(fs.readFileSync(sensPath));

for (const sen of sens) {
  // Leadership quality = sponsored bills in 119th Congress
  sen.leadershipQuality = sen.sponsoredBills119 || 0;
  // Follower quality = cosponsored bills in 119th Congress
  sen.followerQuality = sen.cosponsoredBills119 || 0;
}

fs.writeFileSync(
  path.join(__dirname, '../public/senators-scores.json'),
  JSON.stringify(sens, null, 2)
);
console.log('Generated Senate scores (leadership/follower counts only)');
