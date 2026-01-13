// legislation-scraper.js
// Scrapes Congress.gov API for bills and amendments sponsored/cosponsored by each senator
// Outputs public/senators-legislation.json

const fs = require('fs');
const fetch = require('node-fetch');

const legislators = JSON.parse(fs.readFileSync('public/legislators-current.json', 'utf8'));
const senators = legislators.filter(l => l.terms.some(t => t.type === 'sen'));

const BASE_URL = 'https://api.congress.gov/v3';

async function fetchJSON(url) {
  const res = await fetch(url, { headers: { 'X-Api-Key': process.env.CONGRESS_API_KEY } });
  if (!res.ok) {
    console.error(`Failed to fetch ${url}: ${res.status}`);
    return null;
  }
  return res.json();
}

async function scrapeSenator(sen) {
  const bioguideId = sen.id.bioguide;
  console.log(`Scraping legislation for ${sen.name.official_full} (${bioguideId})`);

  const counts = {
    sponsoredBills: 0,
    sponsoredAmendments: 0,
    cosponsoredBills: 0,
    cosponsoredAmendments: 0,
    becameLawSponsoredBills: 0,
    becameLawSponsoredAmendments: 0,
    becameLawCosponsoredBills: 0,
    becameLawCosponsoredAmendments: 0
  };

  // Sponsored bills/resolutions
  const bills = await fetchJSON(`${BASE_URL}/member/${bioguideId}/bills?congress=119`);
  if (bills && bills.bills) {
    counts.sponsoredBills = bills.bills.length;
    counts.becameLawSponsoredBills = bills.bills.filter(b => b.latestAction?.text?.includes('Became Public Law')).length;
  }

  // Cosponsored bills/resolutions
  const cosponsored = await fetchJSON(`${BASE_URL}/member/${bioguideId}/bills?congress=119&cosponsored=true`);
  if (cosponsored && cosponsored.bills) {
    counts.cosponsoredBills = cosponsored.bills.length;
    counts.becameLawCosponsoredBills = cosponsored.bills.filter(b => b.latestAction?.text?.includes('Became Public Law')).length;
  }

  // Sponsored amendments
  const amendments = await fetchJSON(`${BASE_URL}/member/${bioguideId}/amendments?congress=119`);
  if (amendments && amendments.amendments) {
    counts.sponsoredAmendments = amendments.amendments.length;
    counts.becameLawSponsoredAmendments = amendments.amendments.filter(a => a.latestAction?.text?.includes('Agreed to')).length;
  }

  // Cosponsored amendments
  const coamendments = await fetchJSON(`${BASE_URL}/member/${bioguideId}/amendments?congress=119&cosponsored=true`);
  if (coamendments && coamendments.amendments) {
    counts.cosponsoredAmendments = coamendments.amendments.length;
    counts.becameLawCosponsoredAmendments = coamendments.amendments.filter(a => a.latestAction?.text?.includes('Agreed to')).length;
  }

  return { bioguideId, ...counts };
}

async function run() {
  const results = [];
  for (const sen of senators) {
    const data = await scrapeSenator(sen);
    results.push(data);
  }
  fs.writeFileSync('public/senators-legislation.json', JSON.stringify(results, null, 2));
  console.log('Legislation scraper complete!');
}

run().catch(err => console.error(err));
