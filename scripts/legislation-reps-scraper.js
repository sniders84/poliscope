// scripts/legislation-reps-scraper.js
// Purpose: Scrape House legislation (bills + resolutions) for the 119th Congress
// Enriches representatives-rankings.json with sponsor/cosponsor counts

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const OUT_PATH = path.join(__dirname, '..', 'public', 'representatives-rankings.json');
const API_KEY = process.env.CONGRESS_API_KEY;
const CONGRESS = 119;

// House bill types
const TYPES = ['hr', 'hres', 'hconres', 'hjres'];

async function fetchAll(url) {
  let results = [];
  while (url) {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`Bad response ${res.status} for ${url}`);
      break;
    }
    const data = await res.json();
    results = results.concat(data.bills || []);
    url = data.pagination?.next_url
      ? `https://api.congress.gov${data.pagination.next_url}&api_key=${API_KEY}&format=json`
      : null;
  }
  return results;
}

async function fetchDetail(billUrl) {
  const detailUrl = `${billUrl}&api_key=${API_KEY}&format=json`;
  const res = await fetch(detailUrl);
  if (!res.ok) {
    console.error(`Bad detail response ${res.status} for ${detailUrl}`);
    return null;
  }
  const data = await res.json();
  return data.bill;
}

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

(async function main() {
  const reps = JSON.parse(fs.readFileSync(OUT_PATH, 'utf-8')).map(ensureLegislationShape);
  const repMap = new Map(reps.map(r => [r.bioguideId, r]));

  let attached = 0;

  for (const type of TYPES) {
    let url = `https://api.congress.gov/v3/bill/${CONGRESS}/${type}?api_key=${API_KEY}&format=json&pageSize=250&offset=0`;
    const bills = await fetchAll(url);

    for (const bill of bills) {
      const detail = await fetchDetail(bill.url);
      if (!detail) continue;

      // Sponsors
      for (const s of detail.sponsors || []) {
        if (s.bioguideId && repMap.has(s.bioguideId)) {
          repMap.get(s.bioguideId).sponsoredBills++;
          attached++;
        }
      }

      // Cosponsors
      for (const c of detail.cosponsors?.items || []) {
        if (c.bioguideId && repMap.has(c.bioguideId)) {
          repMap.get(c.bioguideId).cosponsoredBills++;
          attached++;
        }
      }
    }
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(reps, null, 2));
  console.log(`Updated representatives-rankings.json with legislation counts (${attached} sponsor/cosponsor entries attached)`);
})();
