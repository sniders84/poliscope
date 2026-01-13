const fs = require('fs');
const fetch = require('node-fetch');

const CONGRESS_API_KEY = process.env.CONGRESS_API_KEY;

const base = JSON.parse(fs.readFileSync('public/senators-rankings.json', 'utf8'));

async function getLegislation(bioguideId) {
  try {
    const url = `https://api.congress.gov/v3/member/${bioguideId}/sponsored-legislation?limit=250&api_key=${CONGRESS_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.log(`Failed to fetch legislation for ${bioguideId}: ${res.status}`);
      return { sponsoredLegislation: 0, sponsoredAmendments: 0, cosponsoredLegislation: 0, cosponsoredAmendments: 0, becameLawLegislation: 0, becameLawAmendments: 0, becameLawCosponsoredAmendments: 0 };
    }
    const data = await res.json();
    // Count bills, amendments, resolutions, became law, etc.
    // (Your existing counting logic here, renamed to Legislation)
    const sponsoredLegislation = data.sponsoredLegislation?.length || 0; // Bills + resolutions + amendments
    // ... Add full counting for cosponsored, amendments, became law (from data or additional calls)
    // For example:
    const sponsoredAmendments = data.sponsoredLegislation.filter(l => l.type === 'amendment').length;
    // Etc.
    return { sponsoredLegislation, sponsoredAmendments, cosponsoredLegislation, cosponsoredAmendments, becameLawLegislation, becameLawAmendments, becameLawCosponsoredAmendments };
  } catch (err) {
    console.error(`Error for ${bioguideId}: ${err.message}`);
    return { sponsoredLegislation: 0, sponsoredAmendments: 0, cosponsoredLegislation: 0, cosponsoredAmendments: 0, becameLawLegislation: 0, becameLawAmendments: 0, becameLawCosponsoredAmendments: 0 };
  }
}

async function main() {
  for (const sen of base) {
    const data = await getLegislation(sen.bioguideId);
    sen.sponsoredLegislation = data.sponsoredLegislation;
    sen.sponsoredAmendments = data.sponsoredAmendments;
    sen.cosponsoredLegislation = data.cosponsoredLegislation;
    sen.cosponsoredAmendments = data.cosponsoredAmendments;
    sen.becameLawLegislation = data.becameLawLegislation;
    sen.becameLawAmendments = data.becameLawAmendments;
    sen.becameLawCosponsoredAmendments = data.becameLawCosponsoredAmendments;
    console.log(`Updated ${sen.name}: sponsoredLegislation ${data.sponsoredLegislation}`);
  }

  fs.writeFileSync('public/senators-rankings.json', JSON.stringify(base, null, 2));
  console.log('senators-rankings.json updated with legislation!');
}

main();
