// scripts/merge-representatives.js
//
// Purpose: Merge legislation data from legislation-representatives.json into representatives-rankings.json
// Output: updated public/representatives-rankings.json

const fs = require('fs');
const path = require('path');

const rankingsPath = path.join(__dirname, '../public/representatives-rankings.json');
const legisPath = path.join(__dirname, '../public/legislation-representatives.json');

let rankings = JSON.parse(fs.readFileSync(rankingsPath, 'utf-8'));
const legis = JSON.parse(fs.readFileSync(legisPath, 'utf-8'));

// Build lookup by bioguideId
const legisMap = new Map(legis.map(m => [m.bioguideId, m]));

// Inject legislation data
for (const rep of rankings) {
  const legData = legisMap.get(rep.bioguideId);
  if (legData) {
    Object.assign(rep, {
      sponsoredBills: legData.sponsoredBills,
      cosponsoredBills: legData.cosponsoredBills,
      becameLawBills: legData.becameLawBills,
      becameLawCosponsoredBills: legData.becameLawCosponsoredBills,
      lastUpdated: legData.lastUpdated
    });
  }
}

fs.writeFileSync(rankingsPath, JSON.stringify(rankings, null, 2));
console.log(`Merged legislation data into representatives-rankings.json (${rankings.length} records)`);
