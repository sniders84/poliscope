const fs = require('fs');

const base = JSON.parse(fs.readFileSync('public/senators-rankings.json', 'utf8'));
const legislation = JSON.parse(fs.readFileSync('public/senators-legislation.json', 'utf8'));
const committees = JSON.parse(fs.readFileSync('public/senators-committees.json', 'utf8'));
const votes = JSON.parse(fs.readFileSync('public/senators-votes.json', 'utf8'));

const merged = base.map(sen => {
  const leg = legislation.find(l => l.bioguideId === sen.bioguideId) || {};
  const comm = committees.find(c => c.name === sen.name) || { committees: [] };
  const vote = votes.find(v => v.name === sen.name) || { missedVotes: 0, totalVotes: 0 };

  return {
    ...sen,
    ...leg, // sponsoredBills, amendments, etc.
    committees: comm.committees,
    missedVotes: vote.missedVotes,
    totalVotes: vote.totalVotes
  };
});

fs.writeFileSync('public/senators-full.json', JSON.stringify(merged, null, 2));
console.log('Merged senators-full.json created!');
