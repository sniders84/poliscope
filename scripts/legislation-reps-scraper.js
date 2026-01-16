// scripts/legislation-reps-scraper.js
// Purpose: Pull House legislation (bills + amendments) for the 119th Congress via Congress.gov API
// Updates representatives-rankings.json with sponsored/cosponsored counts and "became law"/"agreed to" tallies

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const OUT_PATH = path.join(__dirname, '..', 'public', 'representatives-rankings.json');
const API_KEY = process.env.CONGRESS_API_KEY;
const BASE = 'https://api.congress.gov/v3';
const CONGRESS = 119;

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

async function fetchAllPages(url, itemKey) {
  let results = [];
  let next = url;
  while (next) {
    const res = await fetch(next);
    if (!res.ok) {
      console.error(`Bad response for ${next}: ${res.status}`);
      break;
    }
    const data = await res.json();
    const items = data?.[itemKey] || [];
    results = results.concat(items);
    next = data?.pagination?.next_url
      ? `${BASE}${data.pagination.next_url}&api_key=${API_KEY}`
      : null;
  }
  return results;
}

function countBecamePublicLaw(items) {
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
  const repIndex = new Map(reps.map(r => [r.bioguideId, r]));

  // 1) Bills via member endpoints (scoped to 119th)
  for (const r of reps) {
    const bioguide = r.bioguideId;
    if (!bioguide) continue;

    const sponsoredUrl = `${BASE}/member/${bioguide}/sponsored-legislation?congress=${CONGRESS}&api_key=${API_KEY}`;
    const sponsored = await fetchAllPages(sponsoredUrl, 'legislation');
    r.sponsoredBills = sponsored.length;
    r.becameLawBills = countBecamePublicLaw(sponsored);

    const cosponsoredUrl = `${BASE}/member/${bioguide}/cosponsored-legislation?congress=${CONGRESS}&api_key=${API_KEY}`;
    const cosponsored = await fetchAllPages(cosponsoredUrl, 'legislation');
    r.cosponsoredBills = cosponsored.length;
  }

  // 2) Amendments via amendment endpoints (HAMDT for House), then attribute to members
  // Pull once, then distribute counts to reps by sponsor/cosponsors
  const hamdtUrl = `${BASE}/amendment/${CONGRESS}/hamdt?api_key=${API_KEY}`;
  const allAmendments = await fetchAllPages(hamdtUrl, 'amendments');

  for (const a of allAmendments) {
    const sponsorId = a.sponsor?.bioguideId;
    const agreed = (a.latestAction?.action?.toLowerCase() || '').includes('agreed to');

    if (sponsorId && repIndex.has(sponsorId)) {
      const rep = repIndex.get(sponsorId);
      rep.sponsoredAmendments++;
      if (agreed) rep.becameLawAmendments++;
    }

    const cos = a.cosponsors || [];
    for (const c of cos) {
      const cid = c.bioguideId;
      if (cid && repIndex.has(cid)) {
        const rep = repIndex.get(cid);
        rep.cosponsoredAmendments++;
        if (agreed) rep.becameLawCosponsoredAmendments++;
      }
    }
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(reps, null, 2));
  console.log(`Updated representatives-rankings.json with legislation (bills + amendments) for ${reps.length} House members`);
})().catch(err => {
  console.error('Legislation scraper failed:', err);
  process.exit(1);
});
