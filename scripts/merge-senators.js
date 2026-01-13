// merge-senators.js
// Merges legislation, committees, and votes into senators-rankings.json

const fs = require('fs');

function loadJSON(path) {
  if (!fs.existsSync(path)) return [];
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

function run() {
  const legislators = JSON.parse(fs.readFileSync('public/legislators-current.json', 'utf8'));
  const senators = legislators.filter(l => l.terms.some(t => t.type === 'sen'));

  const legislation = loadJSON('public/senators-legislation.json');
  const committees = loadJSON('public/senators-committees.json');
  const votes = loadJSON('public/senators-votes.json');

  const rankings = senators.map(sen => {
    const bioguideId = sen.id.bioguide;

    const leg = legislation.find(l => l.bioguideId === bioguideId) || {};
    const com = committees.find(c => c.bioguideId === bioguideId) || {};
    const vot = votes.find(v => v.bioguideId === bioguideId) || {};

    return {
      name: sen.name.official_full,
      state: sen.terms[sen.terms.length - 1].state,
      party: sen.terms[sen.terms.length - 1].party,
      office: 'Senator',
      bioguideId,

      // Legislative counts
      sponsoredBills: leg.sponsoredBills || 0,
      sponsoredAmendments: leg.sponsoredAmendments || 0,
      cosponsoredBills: leg.cosponsoredBills || 0,
      cosponsoredAmendments: leg.cosponsoredAmendments || 0,
      becameLawSponsoredBills: leg.becameLawSponsoredBills || 0,
      becameLawSponsoredAmendments: leg.becameLawSponsoredAmendments || 0,
      becameLawCosponsoredBills: leg.becameLawCosponsoredBills || 0,
      becameLawCosponsoredAmendments: leg.becameLawCosponsoredAmendments || 0,

      // Committees
      committees: com.committees || [],
      committeeLeadership: com.committeeLeadership || [],

      // Votes
      votesCast: vot.votesCast || 0,
      missedVotes: vot.missedVotes || 0,
      missedPct: vot.missedPct || 0
    };
  });

  fs.writeFileSync('public/senators-rankings.json', JSON.stringify(rankings, null, 2));
  console.log('Merged senators-rankings.json created! Legislative, committees, and votes unified by bioguideId.');
}

run();
