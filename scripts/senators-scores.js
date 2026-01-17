const fs = require('fs');
const path = require('path');

const rankings = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/senators-rankings.json')));

rankings.forEach(sen => {
  const sponsored = sen.legislation?.length || 0;
  const votes = sen.votes?.length || 0;
  sen.score = sponsored + votes; // simple scoring logic, adjust as needed
});

fs.writeFileSync(path.join(__dirname, '../public/senators-scores.json'), JSON.stringify(rankings, null, 2));
console.log('Generated Senate scores');
