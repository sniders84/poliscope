// legislation-scraper.js
// 119th Congress ONLY — sponsored/cosponsored legislation per senator
// Outputs public/senators-legislation.json

const fs = require('fs');
const fetch = require('node-fetch');

const CONGRESS = '119';
const BASE_URL = 'https://api.congress.gov/v3';

const legislators = JSON.parse(fs.readFileSync('public/legislators-current.json', 'utf8'));
const senators = legislators.filter(l => l.terms.some(t => t.type === 'sen'));

const API_KEY = process.env.CONGRESS_API_KEY;
if (!API_KEY) {
  console.error('Congress API key not found in environment');
  process.exit(1);
}
const HEADERS = { 'X-Api-Key': API_KEY };

async function getJSON(url) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

// Correct member endpoints, hard-limited to 119th Congress
function memberLegislationUrl(bioguideId, type) {
  // type: 'sponsored' | 'cosponsored'
  return `${BASE_URL}/member/${bioguideId}/${type}-legislation?congress=${CONGRESS}&format=json`;
}

async function scrapeSenator(sen) {
  const bioguideId = sen.id.bioguide;
  const name = sen.name.official_full;
  console.log(`Scraping legislation for ${name} (${bioguideId})`);

  let sponsoredCount = 0;
  let cosponsoredCount = 0;
  let becameLawSponsored = 0;
  let becameLawCosponsored = 0;

  // Sponsored (119th only)
  try {
    const data = await getJSON(memberLegislationUrl(bioguideId, 'sponsored'));
    sponsoredCount = data?.pagination?.count || 0;
    // First page scan for became law (no full pagination crawl)
    const items = Array.isArray(data?.legislation) ? data.legislation : [];
    becameLawSponsored = items.filter(i => i?.latestAction?.text?.includes('Became Public Law')).length;
  } catch (err) {
    console.error(`Sponsored fetch failed for ${bioguideId}: ${err.message}`);
  }

  // Cosponsored (119th only)
  try {
    const data = await getJSON(memberLegislationUrl(bioguideId, 'cosponsored'));
    cosponsoredCount = data?.pagination?.count || 0;
    const items = Array.isArray(data?.legislation) ? data.legislation : [];
    becameLawCosponsored = items.filter(i => i?.latestAction?.text?.includes('Became Public Law')).length;
  } catch (err) {
    console.error(`Cosponsored fetch failed for ${bioguideId}: ${err.message}`);
  }

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
