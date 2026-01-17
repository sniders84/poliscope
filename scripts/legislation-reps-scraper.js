// scripts/legislation-reps-scraper.js
// Purpose: Scrape House legislation (bills + resolutions + amendments) for the 119th Congress
// Enriches representatives-rankings.json with sponsor/cosponsor counts and became-law tallies
// Includes unconditional debug logging for Alma Adams (A000370)

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const OUT_PATH = path.join(__dirname, '..', 'public', 'representatives-rankings.json');
const API_KEY = process.env.CONGRESS_API_KEY;
const CONGRESS = process.env.CONGRESS_NUMBER || 119;

function ensureLegislationShape(rep) {
  rep.sponsoredBills ??= 0;
  rep.cosponsoredBills ??= 0;
  rep.sponsoredAmendments ??= 0;
  rep.cosponsoredAmendments ??= 0;
  rep.becameLawBills ??= 0;
  rep.becameLawAmendments ??= 0;
  rep.becameLawCosponsoredAmendments ??= 0;
  return rep;
}

async function fetchAllPages(url, key) {
  let results = [];
  while (url) {
    const res = await fetch(url);
    if (!res.ok) break;
    const data = await res.json();
    results = results.concat(data[key] || []);
    url = data.pagination?.next_url
      ? `https://api.congress.gov${data.pagination.next_url}&api_key=${API_KEY}&format=json`
      : null;
  }
  return results;
}

async function fetchMemberLegislation(bioguideId, type, billType = null) {
  let base = `https://api.congress.gov/v3/member/${bioguideId}/${type}-legislation?congress=${CONGRESS}&api_key=${API_KEY}&format=json&pageSize=250&offset=0`;
  if (billType) base += `&bill_type=${billType}`;
  const key = billType === 'amendment' ? 'amendments' : 'bills';
  return await fetchAllPages(base, key);
}

(async function main() {
  if (!API_KEY) {
    console.error('Missing CONGRESS_API_KEY');
    process.exit(1);
  }

  const reps = JSON.parse(fs.readFileSync(OUT_PATH, 'utf-8')).map(ensureLegislationShape);
  const repMap = new Map(reps.map(r => [r.bioguideId, r]));

  let attached = 0;

  for (const rep of reps) {
    const id = rep.bioguideId;
    if (!id) continue;

    // Sponsored bills/resolutions
    const sponsored = await fetchMemberLegislation(id, 'sponsored');
    rep.sponsoredBills += sponsored.length;
    rep.becameLawBills += sponsored.filter(b => (b.latestAction?.action || '').toLowerCase().includes('became public law')).length;
    attached += sponsored.length;

    // Cosponsored bills/resolutions
    const cosponsored = await fetchMemberLegislation(id, 'cosponsored');
    rep.cosponsoredBills += cosponsored.length;
    attached += cosponsored.length;

    // Sponsored amendments
    const sponsoredAmendments = await fetchMemberLegislation(id, 'sponsored', 'amendment');
    rep.sponsoredAmendments += sponsoredAmendments.length;
    rep.becameLawAmendments += sponsoredAmendments.filter(a => (a.latestAction?.action || '').toLowerCase().includes('became public law')).length;
    attached += sponsoredAmendments.length;

    // Cosponsored amendments
    const cosponsoredAmendments = await fetchMemberLegislation(id, 'cosponsored', 'amendment');
    rep.cosponsoredAmendments += cosponsoredAmendments.length;
    rep.becameLawCosponsoredAmendments += cosponsoredAmendments.filter(a => (a.latestAction?.action || '').toLowerCase().includes('became public law')).length;
    attached += cosponsoredAmendments.length;

    // Unconditional debug logging for Alma Adams
    if (id === 'A000370') {
      console.log('DEBUG Alma Adams sponsored bills array:');
      console.log(JSON.stringify(sponsored, null, 2));
      console.log('DEBUG Alma Adams cosponsored bills array:');
      console.log(JSON.stringify(cosponsored, null, 2));
      console.log('DEBUG Alma Adams sponsored amendments array:');
      console.log(JSON.stringify(sponsoredAmendments, null, 2));
      console.log('DEBUG Alma Adams cosponsored amendments array:');
      console.log(JSON.stringify(cosponsoredAmendments, null, 2));
    }
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(reps, null, 2));
  console.log(`Updated representatives-rankings.json with legislation + amendments (${attached} entries attached)`);
})();
