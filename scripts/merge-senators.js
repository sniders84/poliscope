const fs = require('fs');

// Load component datasets
const legislation = JSON.parse(fs.readFileSync('public/senators-legislation.json'));
const committees = JSON.parse(fs.readFileSync('public/senators-committees.json'));
const votes = JSON.parse(fs.readFileSync('public/senators-votes.json'));

// Index committees and votes by name for quick lookup
const committeesIndex = {};
committees.forEach(s => { committeesIndex[s.name] = s; });

const votesIndex = {};
votes.forEach(s => { votesIndex[s.name] = s; });

const merged = legislation.map(s => {
  const committeesData = committeesIndex[s.name]?.committees || [];
  const votesData = votesIndex[s.name] || { missedVotes: 0, totalVotes: 0 };

  return {
    name: s.name,
    bioguideId: s.bioguideId,
    // Legislation stats
    sBills: s.sBills,
    sAmend: s.sAmend,
    cBills: s.cBills,
    cAmend: s.cAmend,
    becameLawB: s.becameLawB,
    becameLawAmend: s.becameLawAmend,
    becameLawCosponsoredAmend: s.becameLawCosponsoredAmend,
    // Committees with roles
    committees: committeesData,
    // Votes
    missedVotes: votesData.missedVotes,
    totalVotes: votesData.totalVotes
  };
});

fs.writeFileSync('public/senators-rankings.json', JSON.stringify(merged, null, 2));
console.log('senators-rankings.json fully merged and updated!');
