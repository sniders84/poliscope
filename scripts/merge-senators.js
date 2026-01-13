const fs = require('fs');

function mergeData() {
  const base = JSON.parse(fs.readFileSync('public/senators-rankings.json', 'utf8'));
  const legislation = JSON.parse(fs.readFileSync('public/senators-legislation.json', 'utf8'));
  const committees = JSON.parse(fs.readFileSync('public/senators-committees.json', 'utf8'));
  const votes = JSON.parse(fs.readFileSync('public/senators-votes.json', 'utf8'));

  // Maps keyed by bioguideId (primary) and name (fallback)
  const legMap = new Map(legislation.map(l => [l.bioguideId || l.name, l]));
  const commMap = new Map(committees.map(c => [c.bioguideId || c.name, c.committees || []]));
  const voteMap = new Map(votes.map(v => [v.name, v]));

  const merged = base.map(sen => {
    const bioguide = sen.bioguideId;
    const name = sen.name;

    // Prioritize bioguide match
    const leg = legMap.get(bioguide) || legMap.get(name) || {};
    const comm = commMap.get(bioguide) || commMap.get(name) || [];
    const vote = voteMap.get(name) || { missedVotes: 0, totalVotes: 0 };

    return {
      name: sen.name,
      state: sen.state || '',
      party: sen.party || '',
      bioguideId: sen.bioguideId,
      committees: comm,  // <-- this will now be populated
      missedVotes: vote.missedVotes,
      totalVotes: vote.totalVotes,
      sponsoredBills: leg.sponsoredBills || 0,
      sponsoredAmendments: leg.sponsoredAmendments || 0,
      cosponsoredBills: leg.cosponsoredBills || 0,
      cosponsoredAmendments: leg.cosponsoredAmendments || 0,
      becameLawBills: leg.becameLawBills || 0,
      becameLawAmendments: leg.becameLawAmendments || 0,
      becameLawCosponsoredAmendments: leg.becameLawCosponsoredAmendments || 0
    };
  });

  fs.writeFileSync('public/senators-full.json', JSON.stringify(merged, null, 2));
  console.log('Merged senators-full.json created! Committees attached by bioguideId.');
}

mergeData();
