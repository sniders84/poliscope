// legislation-scraper.js
// Strict 119th Congress ONLY — sponsored/cosponsored legislation per senator
// Outputs public/senators-legislation.json

const fs = require('fs');
const fetch = require('node-fetch');

const CONGRESS = 119;
const BASE_URL = 'https://api.congress.gov/v3';
const LIMIT = 250; // max page size to minimize requests
const SLEEP_MS = 40;

const legislators = JSON.parse(fs.readFileSync('public/legislators-current.json', 'utf8'));
const senators = legislators.filter(l => l.terms.some(t => t.type === 'sen'));

const API_KEY = process.env.CONGRESS_API_KEY;
if (!API_KEY) {
  console.error('Congress API key not found in environment');
  process.exit(1);
}
const HEADERS = { 'X-Api-Key': API_KEY };

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function getJSON(url) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

// Correct member endpoints with explicit congress, limit, and offset
function memberLegislationUrl(bioguideId, type, offset = 0) {
  // type: 'sponsored' | 'cosponsored'
  const params = new URLSearchParams({
    congress: String(CONGRESS),
    format: 'json',
    limit: String(LIMIT),
    offset: String(offset),
  });
  return `${BASE_URL}/member/${bioguideId}/${type}-legislation?${params.toString()}`;
}

// Page through results and filter strictly to 119th Congress
async function fetchAllLegislation(bioguideId, type) {
  let offset = 0;
  let all = [];
  let total = null;

  while (true) {
    const url = memberLegislationUrl(bioguideId, type, offset);
    const data = await getJSON(url);

    // Capture reported total for debugging, but we will compute our own filtered totals
    if (total === null && data?.pagination?.count != null) {
      total = data.pagination.count;
    }

    const items = Array.isArray(data?.legislation) ? data.legislation : [];
    // Strict filter: only keep items where congress === 119
    const filtered = items.filter(i => Number(i?.congress) === CONGRESS);
    all.push(...filtered);

    // If fewer than LIMIT returned, we’re done
    if (items.length < LIMIT) break;

    offset += LIMIT;
    await sleep(SLEEP_MS);
  }

  return all;
}

function countBecamePublicLaw(items) {
  return items.filter(i => i?.latestAction?.text?.includes('Became Public Law')).length;
}

async function scrapeSenator(sen) {
  const bioguideId = sen.id.bioguide;
  const name = sen.name.official_full;
  console.log(`Scraping legislation for ${name} (${bioguideId})`);

  let sponsoredItems = [];
  let cosponsoredItems = [];

  try {
    sponsoredItems = await fetchAllLegislation(bioguideId, 'sponsored');
  } catch (err) {
    console.error(`Sponsored fetch failed for ${bioguideId}: ${err.message}`);
  }

  try {
    cosponsoredItems = await fetchAllLegislation(bioguideId, 'cosponsored');
  } catch (err) {
    console.error(`Cosponsored fetch failed for ${bioguideId}: ${err.message}`);
  }

  const sponsoredCount = sponsoredItems.length;
  const cosponsoredCount = cosponsoredItems.length;
  const becameLawSponsored = countBecamePublicLaw(sponsoredItems);
  const becameLawCosponsored = countBecamePublicLaw(cosponsoredItems);

  return {
    bioguideId,
    sponsoredBills: sponsoredCount,
    cosponsoredBills: cosponsoredCount,
    becameLawSponsoredBills: becameLawSponsored,
    becameLawCosponsoredBills: becameLawCosponsored,
  };
}

async function run() {
  const results = [];
  for (const sen of senators) {
    try {
      const row = await scrapeSenator(sen);
      results.push(row);
    } catch (err) {
      console.error(`Error scraping ${sen.name.official_full}: ${err.message}`);
    }
  }
  fs.writeFileSync('public/senators-legislation.json', JSON.stringify(results, null, 2));
  console.log('Legislation scraper complete!');
}

run().catch(err => console.error(err));
