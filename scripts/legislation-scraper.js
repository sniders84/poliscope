// legislation-scraper.js
// Scrapes Congress.gov API for sponsored/cosponsored bills & amendments
// Outputs public/senators-legislation.json

const fs = require('fs');
const fetch = require('node-fetch');

const API_KEY = process.env.CONGRESS_API_KEY;
const BASE_URL = 'https://api.congress.gov/v3/member';

async function fetchAllPages(url) {
  let results = [];
  let nextUrl = url;

  while (nextUrl) {
    const res = await fetch(nextUrl);
    const data = await res.json();

    if (data.bills) results = results.concat(data.bills);
    if (data.amendments) results = results.concat(data.amendments);

    nextUrl = data.pagination?.next_url || null;
  }

  return results;
}

async function scrapeLegislationForMember(bioguideId) {
  const url = `${BASE_URL}/${bioguideId}/bills?sponsorType=all&api_key=${API_KEY}&congress=119`;
  const bills = await fetchAllPages(url);

  let sponsoredBills = 0,
      cosponsoredBills = 0,
      sponsoredAmendments = 0,
      cosponsoredAmendments = 0,
      becameLawSponsoredBills = 0,
      becameLawCosponsoredBills = 0,
      becameLawSponsoredAmendments = 0,
      becameLawCosponsoredAmendments = 0;

  for (const item of bills) {
    const isAmendment = item.type === 'Amendment';
    const isCosponsor = item.relationship === 'Cosponsor';
    const becameLaw = item.latestAction?.text?.includes('Became Public Law');

    if (isAmendment) {
      if (isCosponsor) {
        cosponsoredAmendments++;
        if (becameLaw) becameLawCosponsoredAmendments++;
      } else {
        sponsoredAmendments++;
        if (becameLaw) becameLawSponsoredAmendments++;
      }
    } else {
      if (isCosponsor) {
        cosponsoredBills++;
        if (becameLaw) becameLawCosponsoredBills++;
      } else {
        sponsoredBills++;
        if (becameLaw) becameLawSponsoredBills++;
      }
    }
  }

  return {
    bioguideId,
    sponsoredBills,
    cosponsoredBills,
    sponsoredAmendments,
    cosponsoredAmendments,
    becameLawSponsoredBills,
    becameLawCosponsoredBills,
    becameLawSponsoredAmendments,
    becameLawCosponsoredAmendments
  };
}

async function run() {
  const legislators = JSON.parse(fs.readFileSync('public/legislators-current.json', 'utf8'));
  const senators = legislators.filter(l => l.terms.some(t => t.type === 'sen'));
  const output = [];

  for (const sen of senators) {
    const bioguideId = sen.id.bioguide;
    const data = await scrapeLegislationForMember(bioguideId);
    output.push({ bioguideId, ...data });
  }

  fs.writeFileSync('public/senators-legislation.json', JSON.stringify(output, null, 2));
  console.log('Legislation scraper complete!');
}

run().catch(err => console.error(err));
