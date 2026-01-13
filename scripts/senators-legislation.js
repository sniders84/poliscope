const fs = require('fs');
const fetch = require('node-fetch');

const CONGRESS_API_KEY = process.env.CONGRESS_API_KEY;
const base = JSON.parse(fs.readFileSync('public/senators-rankings.json', 'utf8'));

async function fetchAllLegislation(urlBase, key) {
  const pageSize = 250;
  let offset = 0;
  let all = [];
  while (true) {
    const url = `${urlBase}?limit=${pageSize}&offset=${offset}&api_key=${CONGRESS_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) break;
    const data = await res.json();
    const items = data[key] || [];
    all = all.concat(items);
    if (items.length < pageSize) break;
    offset += pageSize;
  }
  return all;
}

async function getLegislation(bioguideId) {
  try {
    const sponsoredItems = await fetchAllLegislation(
      `https://api.congress.gov/v3/member/${bioguideId}/sponsored-legislation`,
      'sponsoredLegislation'
    );
    const cosponsoredItems = await fetchAllLegislation(
      `https://api.congress.gov/v3/member/${bioguideId}/cosponsored-legislation`,
      'cosponsoredLegislation'
    );

    const sponsoredLegislation = sponsoredItems.filter(l => l.type !== 'amendment').length;
    const sponsoredAmendments = sponsoredItems.filter(l => l.type === 'amendment').length;

    const cosponsoredLegislation = cosponsoredItems.filter(l => l.type !== 'amendment').length;
    const cosponsoredAmendments = cosponsoredItems.filter(l => l.type === 'amendment').length;

    const becameLawLegislation = sponsoredItems.filter(l =>
      /became law|public law/i.test(l.latestAction?.actionDescription || '')
    ).length;
    const becameLawAmendments = sponsoredItems.filter(l =>
      l.type === 'amendment' && /agreed to|became law|public law/i.test(l.latestAction?.actionDescription || '')
    ).length;
    const becameLawCosponsoredAmendments = cosponsoredItems.filter(l =>
      l.type === 'amendment' && /agreed to|became law|public law/i.test(l.latestAction?.actionDescription || '')
    ).length;

    return {
      sponsoredLegislation,
      sponsoredAmendments,
      cosponsoredLegislation,
      cosponsoredAmendments,
      becameLawLegislation,
      becameLawAmendments,
      becameLawCosponsoredAmendments
    };
  } catch (err) {
    console.error(`Error for ${bioguideId}: ${err.message}`);
    return {
      sponsoredLegislation: 0,
      sponsoredAmendments: 0,
      cosponsoredLegislation: 0,
      cosponsoredAmendments: 0,
      becameLawLegislation: 0,
      becameLawAmendments: 0,
      becameLawCosponsoredAmendments: 0
    };
  }
}

async function main() {
  for (const sen of base) {
    const data = await getLegislation(sen.bioguideId);
    Object.assign(sen, data);
    console.log(`Updated ${sen.name}: sponsoredLegislation ${data.sponsoredLegislation}, cosponsoredLegislation ${data.cosponsoredLegislation}`);
  }
  fs.writeFileSync('public/senators-rankings.json', JSON.stringify(base, null, 2));
  console.log('senators-rankings.json updated with legislation!');
}

main();
