// scripts/legislation-reps-scraper.js
// Purpose: Pull House legislation for the 119th Congress via Congress.gov API

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const OUT_PATH = path.join(__dirname, '..', 'public', 'representatives-rankings.json');
const API_KEY = process.env.CONGRESS_API_KEY;
const BASE = 'https://api.congress.gov/v3';
const CONGRESS = 119; // lock to current "season"

function ensureLegislationShape(rep) {
  rep.sponsoredBills = rep.sponsoredBills || 0;
  rep.cosponsoredBills = rep.cosponsoredBills || 0;
  rep.sponsoredAmendments = rep.sponsoredAmendments || 0;
  rep.cosponsoredAmendments = rep.cosponsoredAmendments || 0;
  rep.becameLawBills = rep.becameLawBills || 0;
  rep.becameLawAmendments = rep.becameLawAmendments || 0;
  rep.becameLawCosponsoredAmendments = rep.becameLawCosponsoredAmendments || 0;
  return rep;
}

async function fetchAllPages(url) {
  let results = [];
  let next = url;
  while (next) {
    const res = await fetch(next);
    if (!res.ok) {
      console.error(`Bad response for ${next}: ${res.status}`);
      break;
    }
    const data = await res.json();
    const items = data?.legislation || [];
    results = results.concat(items);
    next = data?.pagination?.next_url
      ? `${BASE}${data.pagination.next_url}&api_key=${API_KEY}`
      : null;
  }
  return results;
}

function countBecameLawBills(items) {
  return items.filter(b => (b.latestAction?.action?.toLowerCase() || '').includes('became public law')).length;
}
function countAgreedTo(items) {
  return items.filter(a => (a.latestAction?.action?.toLowerCase() || '').includes('agreed to')).length;
}

(async function main() {
  if (!API_KEY) {
    console.error('Missing CONGRESS_API_KEY');
    process.exit(1);
  }

  const reps = JSON.parse(fs.readFileSync(OUT_PATH, 'utf-8')).map(ensureLegislationShape);

  for (const r of reps) {
    const bioguide = r.bioguideId;
    if (!bioguide) continue;

    // Sponsored bills
    const sponsoredBillsUrl = `${BASE}/member/${bioguide}/sponsored-legislation?congress=${CONGRESS}&api_key=${API_KEY}`;
    const sponsoredBills = await fetchAllPages(sponsoredBillsUrl);
    r.sponsoredBills = sponsoredBills.length;
    r.becameLawBills = countBecameLawBills(sponsoredBills);

    // Cosponsored bills
    const cosponsoredBillsUrl = `${BASE}/member/${bioguide}/cosponsored-legislation?congress=${CONGRESS}&api_key=${API_KEY}`;
    const cosponsoredBills = await fetchAllPages(cosponsoredBillsUrl);
    r.cosponsoredBills = cosponsoredBills.length;

    // Sponsored amendments
    const sponsoredAmendmentsUrl = `${BASE}/member/${bioguide}/sponsored-legislation?congress=${CONGRESS}&bill_type=amendment&api_key=${API_KEY}`;
    const sponsoredAmendments = await fetchAllPages(sponsoredAmendmentsUrl);
    r.sponsoredAmendments = sponsoredAmendments.length;
    r.becameLawAmendments = countAgreedTo(sponsoredAmendments);

    // Cosponsored amendments
    const cosponsoredAmendmentsUrl = `${BASE}/member/${bioguide}/cosponsored-legislation?congress=${CONGRESS}&bill_type=amendment&api_key=${API_KEY}`;
    const cosponsoredAmendments = await fetchAllPages(cosponsoredAmendmentsUrl);
    r.cosponsoredAmendments = cosponsoredAmendments.length;
    r.becameLawCosponsoredAmendments = countAgreedTo(cosponsoredAmendments);
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(reps, null, 2));
  console.log(`Updated representatives-rankings.json with legislation data for ${reps.length} representatives`);
})().catch(err => {
  console.error('Legislation scraper failed:', err);
  process.exit(1);
});
