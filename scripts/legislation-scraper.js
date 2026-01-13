// legislation-scraper.js
// Scrapes Congress.gov API for sponsored/cosponsored legislation (bills + resolutions) and amendments
// Outputs public/senators-legislation.json

const fs = require('fs');
const fetch = require('node-fetch');

const API_KEY = process.env.CONGRESS_API_KEY;
const BASE_BILL_URL = 'https://api.congress.gov/v3/bill';
const BASE_AMEND_URL = 'https://api.congress.gov/v3/amendment';

// Helper to fetch all pages of results
async function fetchAllPages(url) {
  let results = [];
  let nextUrl = url;

  while (nextUrl) {
    const res = await fetch(nextUrl);
    if (!res.ok) {
      console.error(`Congress API error: ${res.status} ${res.statusText} for ${nextUrl}`);
      break;
    }
    const data = await res.json();

    if (data.bills) results = results.concat(data.bills);
    if (data.amendments) results = results.concat(data.amendments);

    nextUrl = data.pagination?.next_url || null;
  }

  return results;
}

// Scrape legislation (bills + resolutions) for one LIS ID
async function scrapeLegislation(lisId) {
  const sponsoredUrl = `${BASE_BILL_URL}?sponsorId=${lisId}&congress=119&api_key=${API_KEY}`;
  const cosponsoredUrl = `${BASE_BILL_URL}?cosponsorId=${lisId}&congress=119&api_key=${API_KEY}`;

  const sponsoredBills = await fetchAllPages(sponsoredUrl);
  const cosponsoredBills = await fetchAllPages(cosponsoredUrl);

  let sponsoredCount = 0,
      cosponsoredCount = 0,
      becameLawSponsored = 0,
      becameLawCosponsored = 0;

  for (const b of sponsoredBills) {
    sponsoredCount++;
    if (b.latestAction?.text?.includes('Became Public Law')) becameLawSponsored++;
  }
  for (const b of cosponsoredBills) {
    cosponsoredCount++;
    if (b.latestAction?.text?.includes('Became Public Law')) becameLawCosponsored++;
  }

  return {
    sponsoredBills: sponsoredCount,
    cosponsoredBills: cosponsoredCount,
    becameLawSponsoredBills: becameLawSponsored,
    becameLawCosponsoredBills: becameLawCosponsored
  };
}

// Scrape amendments for one LIS ID
async function scrapeAmendments(lisId) {
  const sponsoredUrl = `${BASE_AMEND_URL}?sponsorId=${lisId}&congress=119&api_key=${API_KEY}`;
  const cosponsoredUrl = `${BASE_AMEND_URL}?cosponsorId=${lisId}&congress=119&api_key=${API_KEY}`;

  const sponsoredAmends = await fetchAllPages(sponsoredUrl);
  const cosponsoredAmends = await fetchAllPages(cosponsoredUrl);

  let sponsoredCount = 0,
      cosponsoredCount = 0,
      becameLawSponsored = 0,
      becameLawCosponsored = 0;

  for (const a of sponsoredAmends) {
    sponsoredCount++;
    if (a.latestAction?.text?.includes('Became Public Law')) becameLawSponsored++;
  }
  for (const a of cosponsoredAmends) {
    cosponsoredCount++;
    if (a.latestAction?.text?.includes('Became Public Law')) becameLawCosponsored++;
  }

  return {
    sponsoredAmendments: sponsoredCount,
    cosponsoredAmendments: cosponsoredCount,
    becameLawSponsoredAmendments: becameLawSponsored,
    becameLawCosponsoredAmendments: becameLawCosponsored
  };
}

async function run() {
  const legislators = JSON.parse(fs.readFileSync('public/legislators-current.json', 'utf8'));
  const senators = legislators.filter(l => l.terms.some(t => t.type === 'sen'));
  const output = [];

  for (const sen of senators) {
    const bioguideId = sen.id.bioguide;
    const lisId = sen.id.lis;   // <-- use LIS ID directly
    if (!lisId) {
      console.error(`No LIS ID found for ${bioguideId}`);
      continue;
    }

    console.log(`Scraping legislation for ${sen.name.official_full} (lisId ${lisId})`);
    const billsData = await scrapeLegislation(lisId);
    const amendData = await scrapeAmendments(lisId);

    output.push({
      bioguideId,
      lisId,
      ...billsData,
      ...amendData
    });
  }

  fs.writeFileSync('public/senators-legislation.json', JSON.stringify(output, null, 2));
  console.log('Legislation scraper complete!');
}

run().catch(err => console.error(err));
