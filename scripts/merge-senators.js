const fs = require('fs');

const baseData = JSON.parse(fs.readFileSync('public/senators-rankings.json', 'utf8'));
const legislationData = JSON.parse(fs.readFileSync('public/senators-legislation.json', 'utf8'));
const committeesData = JSON.parse(fs.readFileSync('public/senators-committees.json', 'utf8'));
const votesData = JSON.parse(fs.readFileSync('public/senators-votes.json', 'utf8'));

const jsonPath = 'public/senators-rankings.json';

function mergeSenatorData(base, legislation, committees, votes) {
  const leg = legislation.find(l => l.bioguideId === base.bioguideId) || {};
  const com = committees.find(c => c.bioguideId === base.bioguideId) || {};
  const vot = votes.find(v => v.bioguideId === base.bioguideId) || {};

  return {
    name: base.name,
    state: base.state,
    party: base.party,
    office: base.office,
    bioguideId: base.bioguideId,

    // Legislation
    sponsoredBills: leg.sponsoredBills || 0,
    sponsoredAmendments: leg.sponsoredAmendments || 0,
    cosponsoredBills: leg.cosponsoredBills || 0,
    cosponsoredAmendments: leg.cosponsoredAmendments || 0,
    becameLawBills: leg.becameLawBills || 0,
    becameLawAmendments: leg.becameLawAmendments || 0,
    becameLawCosponsoredAmendments: leg.becameLawCosponsoredAmendments || 0,

    // Committees
    committees: com.committees || [],

    // Votes
    missedVotes: vot.missedVotes || 0
  };
}

(async () => {
  const output = baseData.map(base =>
    mergeSenatorData(base, legislationData, committeesData, votesData)
  );

  fs.writeFileSync(jsonPath, JSON.stringify(output, null, 2) + '\n');
  console.log('senators-rankings.json fully merged and updated!');
})();
