const fs = require('fs');

function mergeData() {
  const base = JSON.parse(fs.readFileSync('public/senators.json', 'utf8')); // master list of senators
  const legislation = JSON.parse(fs.readFileSync('public/senators-legislation.json', 'utf8'));
  const committees = JSON.parse(fs.readFileSync('public/senators-committees.json', 'utf8'));
  const votes = JSON.parse(fs.readFileSync('public/senators-votes.json', 'utf8'));

  // Maps keyed by bioguideId (primary)
  const legMap = new Map(legislation.map(l => [l.bioguideId, l]));
  const commMap = new Map(committees.map(c => [c.bioguideId, c.committees || []]));
  const voteMap = new Map(votes.map(v => [v.bioguideId, v]));

  const merged = base.map(sen => {
    const bioguide = sen.bioguideId;

    const leg = legMap.get(bioguide) || {};
    const comm = commMap.get(bioguide) || [];
    const vote = voteMap.get(bioguide) || { votesCast: 0, missedVotes: 0, missedPct: 0 };

    return {
      bioguideId: sen.bioguideId,
      name: sen.name,
      state: sen.state || '',
      party: sen.party || '',
      office: "Senator",

      sponsoredBills: leg.sponsoredBills || 0,
      sponsoredAmendments: leg.sponsoredAmendments || 0,
      cosponsoredBills: leg.cosponsoredBills || 0,
      cosponsoredAmendments: leg.cosponsoredAmendments || 0,

      becameLawSponsoredBills: leg.becameLawSponsoredBills || 0,
      becameLawCosponsoredBills: leg.becameLawCosponsoredBills || 0,
      becameLawSponsoredAmendments: leg.becameLawSponsoredAmendments || 0,
      becameLawCosponsoredAmendments: leg.becameLawCosponsoredAmendments || 0,

      committees: comm,

      votesCast: vote.votesCast || 0,
      missedVotes: vote.missedVotes || 0,
      missedPct: vote.missedPct || 0
    };
  });

  fs.writeFileSync('public/senators-rankings.json', JSON.stringify(merged, null, 2));
  console.log('Merged senators-rankings.json created! Legislative, committees, and votes unified by bioguideId.');
}

mergeData();
