const fs = require('fs');
const path = require('path');

const rankingsPath = path.join(__dirname, '../public/senators-rankings.json');
const rankings = JSON.parse(fs.readFileSync(rankingsPath));

for (const sen of rankings) {
  const sponsored = sen.legislation?.length || 0;
  const votes = sen.votes?.length || 0;
  sen.score = sponsored + votes;
}

fs.writeFileSync(path.join(__dirname, '../public/senators-scores.json'), JSON.stringify(rankings, null, 2));
console.log('Generated Senate scores');
