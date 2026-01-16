// scripts/legislation-reps-scraper.js
// Purpose: Pull House legislation for the 119th Congress via Congress.gov API

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const OUT_PATH = path.join(__dirname, '..', 'public', 'representatives-rankings.json');
const API_KEY = process.env.CONGRESS_API_KEY;
const BASE = 'https://api.congress.gov/v3';
const CONGRESS = 119;

async function fetchAllPages(url) {
  let results = [];
  let next = url;
  while (next) {
    const res = await fetch(next);
    if (!res.ok) break;
    const data = await res.json();
    const items = data?.bills || data?.legislation || [];
    results = results.concat(items);
    next = data?.pagination?.next_url
      ? `${BASE}${data.pagination.next_url}&api_key=${API_KEY}`
      : null;
  }
  return results;
}

function countBecameLaw(items) {
  return items.filter(b => (b.latestAction?.action?.toLowerCase() || '').includes('became public law')).length;
}

(async function main() {
  const reps = JSON.parse(fs.readFileSync(OUT_PATH, 'utf-8'));

  for (const r of reps) {
    const bioguide = r.bioguideId;
    if (!bioguide) continue;

    const sponsoredUrl = `${BASE}/member/${bioguide}/sponsored-legislation?congress=${CONGRESS}&api_key=${API_KEY}`;
    const sponsored = await fetchAllPages(sponsoredUrl);
    r.sponsoredBills = sponsored.length;
    r.becameLawBills = countBecameLaw(sponsored);

    const cosponsoredUrl = `${BASE}/member/${bioguide}/cosponsored-legislation?congress=${CONGRESS}&api_key=${API_KEY}`;
    const cosponsored = await fetchAllPages(cosponsoredUrl);
    r.cosponsoredBills = cosponsored.length;
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(reps, null, 2));
  console.log(`Updated representatives-rankings.json with legislation data for ${reps.length} House members`);
})();
