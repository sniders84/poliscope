const fs = require('fs');
const path = require('path');

const legislation = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/senate-legislation.json')));
const votes = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/senate-votes.json')));
const rankings = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/senators-rankings.json')));

rankings.forEach(sen => {
  sen.legislation = legislation.bills?.filter(b => b.sponsor?.bioguideId === sen.bioguideId) || [];
  sen.votes = votes.votes?.filter(v => v.member?.bioguideId === sen.bioguideId) || [];
});

fs.writeFileSync(path.join(__dirname, '../public/senators-rankings.json'), JSON.stringify(rankings, null, 2));
console.log('Merged Senate legislation and votes into senators-rankings.json');
