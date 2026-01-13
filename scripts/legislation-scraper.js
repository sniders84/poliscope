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
    throw new Error(`${res.status}`);
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

// Build member endpoint URL (bioguide or LIS), with format=json and congress=119
function memberUrl(memberId, type, opts = {}) {
  const params = new URLSearchParams({ congress: '119', format: 'json' });
  if (opts.cosponsored) params.set('cosponsored', 'true');
  return `${BASE_URL}/member/${memberId}/${type}?${params.toString()}`;
}

// Try bioguide first, then LIS fallback if 404
async function fetchMemberCollection(sen, type, opts = {}) {
  const bioguideId = sen.id.bioguide;
  const lisId = sen.id.lis;

  // 1) Try Bioguide
  try {
    const url = memberUrl(bioguideId, type, opts);
    return await fetchAllPages(url, type); // collectionKey matches path: 'bills' or 'amendments'
  } catch (err) {
    if (err.message !== '404') throw err;
  }

  // 2) Fallback to LIS
  if (lisId) {
    const urlLis = memberUrl(lisId, type, opts);
    return await fetchAllPages(urlLis, type);
  }

  // If no LIS or both 404, return empty
  return [];
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
  console.log(`Scraping legislation for ${name} (${bioguideId})`);

  // Sponsored bills/resolutions
  const sponsoredBills = await fetchMemberCollection(sen, 'bills', { cosponsored: false });
  // Cosponsored bills/resolutions
  const cosponsoredBills = await fetchMemberCollection(sen, 'bills', { cosponsored: true });

  // Sponsored amendments
  const sponsoredAmendments = await fetchMemberCollection(sen, 'amendments', { cosponsored: false });
  // Cosponsored amendments
  const cosponsoredAmendments = await fetchMemberCollection(sen, 'amendments', { cosponsored: true });

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
