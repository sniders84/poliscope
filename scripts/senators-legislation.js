const fs = require('fs');
const fetch = require('node-fetch');

const base = JSON.parse(fs.readFileSync('public/senators-rankings.json', 'utf8'));

async function getLegislation(bioguideId) {
  const url = `https://api.congress.gov/v3/member/${bioguideId}?api_key=${process.env.CONGRESS_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) return { sponsoredLegislation: 0, sponsoredAmendments: 0, cosponsoredLegislation: 0, cosponsoredAmendments: 0, becameLawLegislation: 0, becameLawAmendments: 0, becameLawCosponsoredAmendments: 0 };

  const data = await res.json();
  // Add logic to count bills, amendments, resolutions, became law, etc.
  // ... (keep your current counting code here, but rename variables to sponsoredLegislation, etc.)
  // For example:
  const sponsoredLegislation = data.member.sponsoredLegislation.total;  // Bills + resolutions + amendments
  // Etc.
  return { sponsoredLegislation, ... };  // Return renamed fields
}

async function main() {
  const output = await Promise.all(base.map(sen => getLegislation(sen.bioguideId)));
  fs.writeFileSync('public/senators-legislation.json', JSON.stringify(output, null, 2));
  console.log('senators-legislation.json fully updated!');
}

main();
