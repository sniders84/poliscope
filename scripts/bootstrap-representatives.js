// scripts/bootstrap-representatives.js
//
// Purpose: Bootstrap basic representatives-rankings.json with current House members (name, bioguideId, party, state, district, etc.)
// Source: legislators-current.json or API
// Output: public/representatives-rankings.json (initial structure)

const fs = require('fs');
const path = require('path');

const legislatorsPath = path.join(__dirname, '../public/legislators-current.json');
const outputPath = path.join(__dirname, '../public/representatives-rankings.json');

const legislators = JSON.parse(fs.readFileSync(legislatorsPath, 'utf-8'));

const results = [];

for (const leg of legislators) {
  const lastTerm = leg.terms?.[leg.terms.length - 1];
  if (!lastTerm || lastTerm.type !== 'rep') continue;

  const bioguideId = leg.id?.bioguide;
  if (!bioguideId) continue;

  const name = `${leg.name.first} ${leg.name.last}`;
  const state = lastTerm.state || '';
  const district = lastTerm.district || '';
  const party = lastTerm.party || '';

  results.push({
    bioguideId,
    name,
    state,
    district,
    party,
    // Placeholder fields to be filled by scraper/merge
    sponsoredBills: 0,
    cosponsoredBills: 0,
    becameLawBills: 0,
    becameLawCosponsoredBills: 0,
    lastUpdated: new Date().toISOString()
  });
}

fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
console.log(`Bootstrapped representatives-rankings.json with ${results.length} current House members`);
