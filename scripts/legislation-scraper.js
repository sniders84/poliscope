// legislation-scraper.js
// Scrapes Congress.gov API for bills and amendments sponsored/cosponsored by each senator (119th Congress)
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

const HEADERS = { 'X-Api-Key': API_KEY };

// Generic fetch with JSON + error handling
async function getJSON(url) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  return res.json();
}

// Paginated fetch for bills/amendments arrays
async function fetchAllPages(url, collectionKey) {
  let items = [];
  let nextUrl = url;

  while (nextUrl) {
    const data = await getJSON(nextUrl);
    const pageItems = data?.[collectionKey] || [];
    items.push(...pageItems);

    const next = data?.pagination?.next;
    nextUrl = next ? `${BASE_URL}${next}&format=json` : null;
  }

  return items;
}

// Build endpoint URL for bills/amendments with memberIds
function endpoint(type, memberId, opts = {}) {
  const params = new URLSearchParams({ congress: '119', format: 'json' });
  if (opts.cosponsored) params.set('cosponsored', 'true');
  return `${BASE_URL}/${type}?${params.toString()}&memberIds=${memberId}`;
}

function countBecameLawBills(bills) {
  return bills.filter(b => b.latestAction?.text?.includes('Became Public Law')).length;
}

function countAgreedAmendments(amendments) {
  return amendments.filter(a => a.latestAction?.text?.includes('Agreed to')).length;
}

async function scrapeSenator(sen) {
  const name = sen.name.official_full;
  const bioguideId = sen.id.bioguide;
  const lisId = sen.id.lis;
  console.log(`Scraping legislation for ${name} (${bioguideId})`);

  let sponsoredBills = [];
  let cosponsoredBills = [];
  let sponsoredAmendments = [];
  let cosponsoredAmendments = [];

  // Try bioguide first, fallback to LIS if needed
  try {
    sponsoredBills = await fetchAllPages(endpoint('bill', bioguideId), 'bills');
  } catch {
    if (lisId) sponsoredBills = await fetchAllPages(endpoint('bill', lisId), 'bills');
  }

  try {
    cosponsoredBills = await fetchAllPages(endpoint('bill', bioguideId, { cosponsored: true }), 'bills');
  } catch {
    if (lisId) cosponsoredBills = await fetchAllPages(endpoint('bill', lisId, { cosponsored: true }), 'bills');
  }

  try {
    sponsoredAmendments = await fetchAllPages(endpoint('amendment', bioguideId), 'amendments');
  } catch {
    if (lisId) sponsoredAmendments = await fetchAllPages(endpoint('amendment', lisId), 'amendments');
  }

  try {
    cosponsoredAmendments = await fetchAllPages(endpoint('amendment', bioguideId, { cosponsored: true }), 'amendments');
  } catch {
    if (lisId) cosponsoredAmendments = await fetchAllPages(endpoint('amendment', lisId, { cosponsored: true }), 'amendments');
  }

  return {
    bioguideId,
    sponsoredBills: sponsoredBills.length,
    cosponsoredBills: cosponsoredBills.length,
    sponsoredAmendments: sponsoredAmendments.length,
    cosponsoredAmendments: cosponsoredAmendments.length,
    becameLawSponsoredBills: countBecameLawBills(sponsoredBills),
    becameLawCosponsoredBills: countBecameLawBills(cosponsoredBills),
    becameLawSponsoredAmendments: countAgreedAmendments(sponsoredAmendments),
    becameLawCosponsoredAmendments: countAgreedAmendments(cosponsoredAmendments),
  };
}

async function run() {
  const results = [];
  for (const sen of senators) {
    try {
      const data = await scrapeSenator(sen);
      results.push(data);
      // small delay to avoid hammering
      await new Promise(r => setTimeout(r, 150));
    } catch (err) {
      console.error(`Error scraping ${sen.name.official_full}: ${err.message}`);
    }
  }
  fs.writeFileSync('public/senators-legislation.json', JSON.stringify(results, null, 2));
  console.log('Legislation scraper complete!');
}

run().catch(err => console.error(err));
