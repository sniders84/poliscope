const fs = require('fs');
const path = require('path');

const rankingsPath = path.join(__dirname, '../public/representatives-rankings.json');
const rankings = JSON.parse(fs.readFileSync(rankingsPath));

for (const rep of rankings) {
  const sponsored = rep.legislation?.length || 0;
  const votes = rep.votes?.length || 0;
  rep.score = sponsored + votes;
}

fs.writeFileSync(path.join(__dirname, '../public/representatives-scores.json'), JSON.stringify(rankings, null, 2));
console.log('Generated House scores');
