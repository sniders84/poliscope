const fs = require('fs');
const path = require('path');

const rankings = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/representatives-rankings.json')));

rankings.forEach(rep => {
  const sponsored = rep.legislation?.length || 0;
  const votes = rep.votes?.length || 0;
  rep.score = sponsored + votes; // simple scoring logic, adjust as needed
});

fs.writeFileSync(path.join(__dirname, '../public/representatives-scores.json'), JSON.stringify(rankings, null, 2));
console.log('Generated House scores');
