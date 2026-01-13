// legislation-scraper.js
// Scrapes Congress.gov API for legislation sponsored/cosponsored by each senator (119th Congress)
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

async function getJSON(url) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  return res.json();
}

// Build endpoint URL for sponsored/cosponsored legislation
function endpoint(type, bioguideId) {
  return `${BASE_URL}/member/${bioguideId}/${type}-legislation?congress=119&format=json`;
}

async function scrapeSenator(sen) {
  const name = sen.name.official_full;
  const bioguideId = sen.id.bioguide;
  console.log(`Scraping legislation for ${name} (${bioguideId})`);

  let sponsored = { count: 0, items: [] };
  let cosponsored = { count: 0, items: [] };

  try {
    const data = await getJSON(endpoint('sponsored', bioguideId));
    sponsored.count = data.pagination.count || 0;
    sponsored.items = data.legislation || [];
  } catch (err) {
    console.error(`Error fetching sponsored for ${name}: ${err.message}`);
  }

  try {
    const data = await getJSON(endpoint('cosponsored', bioguideId));
    cosponsored.count = data.pagination.count || 0;
    cosponsored.items = data.legislation || [];
  } catch (err) {
    console.error(`Error fetching cosponsored for ${name}: ${err.message}`);
  }

  // Became law counts from first page items
  const becameLawSponsored = sponsored.items.filter(
    l => l.latestAction?.text?.includes('Became Public Law')
  ).length;
  const becameLawCosponsored = cosponsored.items.filter(
    l => l.latestAction?.text?.includes('Became Public Law')
  ).length;

  return {
    bioguideId,
    sponsoredBills: sponsored.count,
    cosponsoredBills: cosponsored.count,
    becameLawSponsoredBills: becameLawSponsored,
    becameLawCosponsoredBills: becameLawCosponsored,
    // Amendments are included in legislation results; you can filter by billType if needed
  };
}

async function run() {
  const results = [];
  for (const sen of senators) {
    try {
      const data = await scrapeSenator(sen);
      results.push(data);
    } catch (err) {
      console.error(`Error scraping ${sen.name.official_full}: ${err.message}`);
    }
  }
  fs.writeFileSync('public/senators-legislation.json', JSON.stringify(results, null, 2));
  console.log('Legislation scraper complete!');
}

run().catch(err => console.error(err));
