// legislation-scraper.js
// Fast scraper: uses Congress.gov API pagination.count for totals
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

function endpoint(type, memberId, opts = {}) {
  const params = new URLSearchParams({ congress: '119', format: 'json' });
  if (opts.cosponsored) params.set('cosponsored', 'true');
  return `${BASE_URL}/${type}?${params.toString()}&memberIds=${memberId}`;
}

async function scrapeSenator(sen) {
  const name = sen.name.official_full;
  const bioguideId = sen.id.bioguide;
  const lisId = sen.id.lis;
  console.log(`Scraping legislation for ${name} (${bioguideId})`);

  async function tryFetch(type, opts) {
    try {
      const data = await getJSON(endpoint(type, bioguideId, opts));
      return { count: data.pagination.count, items: data[type] || [] };
    } catch (err) {
      if (lisId) {
        const data = await getJSON(endpoint(type, lisId, opts));
        return { count: data.pagination.count, items: data[type] || [] };
      }
      return { count: 0, items: [] };
    }
  }

  const sponsoredBills = await tryFetch('bill', {});
  const cosponsoredBills = await tryFetch('bill', { cosponsored: true });
  const sponsoredAmendments = await tryFetch('amendment', {});
  const cosponsoredAmendments = await tryFetch('amendment', { cosponsored: true });

  // Became law / agreed to counts only from first page items
  const becameLawSponsoredBills = sponsoredBills.items.filter(b => b.latestAction?.text?.includes('Became Public Law')).length;
  const becameLawCosponsoredBills = cosponsoredBills.items.filter(b => b.latestAction?.text?.includes('Became Public Law')).length;
  const becameLawSponsoredAmendments = sponsoredAmendments.items.filter(a => a.latestAction?.text?.includes('Agreed to')).length;
  const becameLawCosponsoredAmendments = cosponsoredAmendments.items.filter(a => a.latestAction?.text?.includes('Agreed to')).length;

  return {
    bioguideId,
    sponsoredBills: sponsoredBills.count,
    cosponsoredBills: cosponsoredBills.count,
    sponsoredAmendments: sponsoredAmendments.count,
    cosponsoredAmendments: cosponsoredAmendments.count,
    becameLawSponsoredBills,
    becameLawCosponsoredBills,
    becameLawSponsoredAmendments,
    becameLawCosponsoredAmendments,
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
