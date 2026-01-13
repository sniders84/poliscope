const fs = require('fs');

function normalizeName(name) {
  // Handle "Last, First M." -> "First M. Last"
  const parts = name.trim().split(',');
  if (parts.length === 2) {
    return `${parts[1].trim()} ${parts[0].trim()}`;
  }
  return name.trim();
}

function mergeData() {
  const base = JSON.parse(fs.readFileSync('public/senators-rankings.json', 'utf8'));
  const legislation = JSON.parse(fs.readFileSync('public/senators-legislation.json', 'utf8'));
  const committees = JSON.parse(fs.readFileSync('public/senators-committees.json', 'utf8'));
  const votes = JSON.parse(fs.readFileSync('public/senators-votes.json', 'utf8'));

  // Create maps for quick lookup with normalized names
  const legMap = new Map(legislation.map(l => [normalizeName(l.name), l]));
  const commMap = new Map(committees.map(c => [normalizeName(c.name), c.committees]));
  const voteMap = new Map(votes.map(v => [normalizeName(v.name), v]));

  const merged = base.map(sen => {
    const normName = normalizeName(sen.name);
    const leg = legMap.get(normName) || {};
    const comm = commMap.get(normName) || [];
    const vote = voteMap.get(normName) || { missedVotes: 0, totalVotes: 0 };

    return {
      name: sen.name,
      state: sen.state,
      party: sen.party,
      bioguideId: sen.bioguideId,
      committees: comm,
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
  console.log('Merged senators-full.json created!');
}

mergeData();
