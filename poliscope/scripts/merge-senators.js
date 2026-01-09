const fs = require('fs');

const baseData = JSON.parse(fs.readFileSync('public/senators-base.json', 'utf8'));
const legislationData = JSON.parse(fs.readFileSync('public/senators-legislation.json', 'utf8'));
const committeesData = JSON.parse(fs.readFileSync('public/senators-committees.json', 'utf8'));
const votesData = JSON.parse(fs.readFileSync('public/senators-votes.json', 'utf8'));

const jsonPath = 'public/senators-rankings.json';

function mergeSenatorRecords(base, legislation, committees, votes) {
  return {
    name: base.name,
    state: base.state,
    party: base.party,
    office: base.office,
    bioguideId: base.bioguideId,
    sponsoredBills: legislation?.sponsoredBills || 0,
    sponsoredAmendments: legislation?.sponsoredAmendments || 0,
    cosponsoredBills: legislation?.cosponsoredBills || 0,
    cosponsoredAmendments: legislation?.cosponsoredAmendments || 0,
    becameLawBills: legislation?.becameLawBills || 0,
    becameLawAmendments: legislation?.becameLawAmendments || 0,
    committees: committees?.committees || [],
    missedVotes: votes?.missedVotes || 0
  };
}

(async () => {
  const merged = baseData.map(base => {
    const legislation = legislationData.find(l => l.bioguideId === base.bioguideId);
    const committees = committeesData.find(c => c.bioguideId === base.bioguideId);
    const votes = votesData.find(v => v.bioguideId === base.bioguideId);
    return mergeSenatorRecords(base, legislation, committees, votes);
  });

  fs.writeFileSync(jsonPath, JSON.stringify(merged, null, 2) + '\n');
  console.log('senators-rankings.json fully merged and updated!');
})();
