// legislation-scraper.js
// Scrapes Congress.gov API for bills and amendments sponsored/cosponsored by each senator
// Outputs public/senators-legislation.json

const fs = require('fs');
const fetch = require('node-fetch');

const legislators = JSON.parse(fs.readFileSync('public/legislators-current.json', 'utf8'));
const senators = legislators.filter(l => l.terms.some(t => t.type === 'sen'));

const BASE_URL = 'https://api.congress.gov/v3';
const API_KEY = process.env.CONGRESS_API_KEY;

if (!API_KEY) {
  console.error('Congress API key not found in environment');
  process.exit(1);
}

async function fetchAllPages(url) {
  let results = [];
  let nextUrl = url;

  while (nextUrl) {
    const res = await fetch(nextUrl, { headers: { 'X-Api-Key': API_KEY } });
    if (!res.ok) {
      console.error(`Failed to fetch ${nextUrl}: ${res.status}`);
      break;
    }
    const data = await res.json();

    if (data?.bills) results.push(...data.bills);
    if (data?.amendments) results.push(...data.amendments);

    const next = data?.pagination?.next || null;
    nextUrl = next ? `${BASE_URL}${next}&api_key=${API_KEY}` : null;
  }

  return results;
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
  const sponsoredBills = await fetchAllPages(
    `${BASE_URL}/member/${bioguideId}/bills?congress=119&api_key=${API_KEY}`
  );
  counts.sponsoredBills = sponsoredBills.length;
  counts.becameLawSponsoredBills = sponsoredBills.filter(
    b => b.latestAction?.text?.includes('Became Public Law')
  ).length;

  // Cosponsored bills/resolutions
  const cosponsoredBills = await fetchAllPages(
    `${BASE_URL}/member/${bioguideId}/bills?congress=119&cosponsored=true&api_key=${API_KEY}`
  );
  counts.cosponsoredBills = cosponsoredBills.length;
  counts.becameLawCosponsoredBills = cosponsoredBills.filter(
    b => b.latestAction?.text?.includes('Became Public Law')
  ).length;

  // Sponsored amendments
  const sponsoredAmendments = await fetchAllPages(
    `${BASE_URL}/member/${bioguideId}/amendments?congress=119&api_key=${API_KEY}`
  );
  counts.sponsoredAmendments = sponsoredAmendments.length;
  counts.becameLawSponsoredAmendments = sponsoredAmendments.filter(
    a => a.latestAction?.text?.includes('Agreed to')
  ).length;

  // Cosponsored amendments
  const cosponsoredAmendments = await fetchAllPages(
    `${BASE_URL}/member/${bioguideId}/amendments?congress=119&cosponsored=true&api_key=${API_KEY}`
  );
  counts.cosponsoredAmendments = cosponsoredAmendments.length;
  counts.becameLawCosponsoredAmendments = cosponsoredAmendments.filter(
    a => a.latestAction?.text?.includes('Agreed to')
  ).length;

  return { bioguideId, ...counts };
}

async function run() {
  const results = [];
  for (const sen of senators) {
    try {
      const data = await scrapeSenator(sen);
      results.push(data);
      // small delay to be polite to API
      await new Promise(r => setTimeout(r, 200));
    } catch (err) {
      console.error(`Error scraping ${sen.name.official_full}: ${err.message}`);
    }
  }
  fs.writeFileSync('public/senators-legislation.json', JSON.stringify(results, null, 2));
  console.log('Legislation scraper complete!');
}

run().catch(err => console.error(err));
