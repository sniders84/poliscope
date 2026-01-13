// legislation-scraper.js
// Scrapes Congress.gov API for legislation sponsored/cosponsored by each senator (119th Congress only)
// Outputs public/senators-legislation.json

const fs = require('fs');
const fetch = require('node-fetch');

const legislators = JSON.parse(fs.readFileSync('public/legislators-current.json', 'utf8'));
const senators = legislators.filter(l => l.terms.some(t => t.type === 'sen'));

const BASE_URL = 'https://api.congress.gov/v3';
const API_KEY = process.env.CONGRESS_API_KEY;
const HEADERS = { 'X-Api-Key': API_KEY };

if (!API_KEY) {
  console.error('Congress API key not found in environment');
  process.exit(1);
}

async function getJSON(url) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

function endpoint(type, bioguideId) {
  return `${BASE_URL}/member/${bioguideId}/${type}-legislation?congress=119&format=json`;
}

async function scrapeSenator(sen) {
  const bioguideId = sen.id.bioguide;
  console.log(`Scraping legislation for ${sen.name.official_full} (${bioguideId})`);

  let sponsoredCount = 0, cosponsoredCount = 0;
  let becameLawSponsored = 0, becameLawCosponsored = 0;

  try {
    const data = await getJSON(endpoint('sponsored', bioguideId));
    sponsoredCount = data.pagination?.count || 0;
    becameLawSponsored = (data.legislation || []).filter(l => l.latestAction?.text?.includes('Became Public Law')).length;
  } catch (err) {
    console.error(`Error fetching sponsored for ${bioguideId}: ${err.message}`);
  }

  try {
    const data = await getJSON(endpoint('cosponsored', bioguideId));
    cosponsoredCount = data.pagination?.count || 0;
    becameLawCosponsored = (data.legislation || []).filter(l => l.latestAction?.text?.includes('Became Public Law')).length;
  } catch (err) {
    console.error(`Error fetching cosponsored for ${bioguideId}: ${err.message}`);
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
      results.push(await scrapeSenator(sen));
    } catch (err) {
      console.error(`Error scraping ${sen.name.official_full}: ${err.message}`);
    }
  }
  fs.writeFileSync('public/senators-legislation.json', JSON.stringify(results, null, 2));
  console.log('Legislation scraper complete!');
}

run().catch(err => console.error(err));
