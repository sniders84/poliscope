const fs = require('fs');
const fetch = require('node-fetch');

const CONGRESS_API_KEY = process.env.CONGRESS_API_KEY;
const base = JSON.parse(fs.readFileSync('public/senators-rankings.json', 'utf8'));

async function getLegislation(bioguideId) {
  try {
    const url = `https://api.congress.gov/v3/member/${bioguideId}/sponsored-legislation?limit=250&api_key=${CONGRESS_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return {};

    const data = await res.json();
    const items = data.sponsoredLegislation || [];

    const sponsoredLegislation = items.filter(l => l.type !== 'amendment').length;
    const sponsoredAmendments = items.filter(l => l.type === 'amendment').length;

    // TODO: add cosponsored endpoint calls if needed
    const cosponsoredLegislation = 0;
    const cosponsoredAmendments = 0;

    const becameLawLegislation = items.filter(l => /Became Public Law/i.test(l.latestAction?.actionDescription || '')).length;
    const becameLawAmendments = items.filter(l => l.type === 'amendment' && /Became Public Law/i.test(l.latestAction?.actionDescription || '')).length;
    const becameLawCosponsoredAmendments = 0;

    return { sponsoredLegislation, sponsoredAmendments, cosponsoredLegislation, cosponsoredAmendments, becameLawLegislation, becameLawAmendments, becameLawCosponsoredAmendments };
  } catch (err) {
    console.error(`Error for ${bioguideId}: ${err.message}`);
    return {};
  }
}

async function main() {
  for (const sen of base) {
    const data = await getLegislation(sen.bioguideId);
    Object.assign(sen, data);
    console.log(`Updated ${sen.name}: sponsoredLegislation ${data.sponsoredLegislation || 0}`);
  }
  fs.writeFileSync('public/senators-rankings.json', JSON.stringify(base, null, 2));
  console.log('senators-rankings.json updated with legislation!');
}

main();
