const fs = require('fs');
const path = require('path');

const legislation = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/house-legislation.json')));
const votes = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/house-votes.json')));
const rankings = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/representatives-rankings.json')));

rankings.forEach(rep => {
  rep.legislation = legislation.bills?.filter(b => b.sponsor?.bioguideId === rep.bioguideId) || [];
  rep.votes = votes.votes?.filter(v => v.member?.bioguideId === rep.bioguideId) || [];
});

fs.writeFileSync(path.join(__dirname, '../public/representatives-rankings.json'), JSON.stringify(rankings, null, 2));
console.log('Merged House legislation and votes into representatives-rankings.json');
