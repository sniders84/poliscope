const fs = require('fs');

function normalizeName(name) {
  // Remove party-state, commas, middle initials, extra spaces
  let cleaned = name.trim()
    .replace(/\s*\([RD]-[A-Z]{2}\)/g, '')     // strip (R-AL)
    .replace(/,/g, ' ')                        // remove comma
    .replace(/\s+[A-Z]\./g, ' ')               // remove middle initial like " B."
    .replace(/\s+/g, ' ')                      // normalize spaces
    .trim();

  // If it looks like "Last First", flip to "First Last"
  const parts = cleaned.split(' ');
  if (parts.length >= 2 && parts[0].length > 1 && parts[1].length > 1) {
    // Assume first word is last name if short or followed by comma originally
    return `${parts[1]} ${parts[0]}`.trim();
  }

  return cleaned;
}

function mergeData() {
  const base = JSON.parse(fs.readFileSync('public/senators-rankings.json', 'utf8'));
  const legislation = JSON.parse(fs.readFileSync('public/senators-legislation.json', 'utf8'));
  const committees = JSON.parse(fs.readFileSync('public/senators-committees.json', 'utf8'));
  const votes = JSON.parse(fs.readFileSync('public/senators-votes.json', 'utf8'));

  const legMap = new Map(legislation.map(l => [normalizeName(l.name), l]));
  const commMap = new Map(committees.map(c => [normalizeName(c.name), c.committees || []]));
  const voteMap = new Map(votes.map(v => [normalizeName(v.name), v]));

  const merged = base.map(sen => {
    const normName = normalizeName(sen.name);
    const leg = legMap.get(normName) || {};
    const comm = commMap.get(normName) || [];
    const vote = voteMap.get(normName) || { missedVotes: 0, totalVotes: 0 };

    return {
      name: sen.name,
      state: sen.state || '',
      party: sen.party || '',
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
