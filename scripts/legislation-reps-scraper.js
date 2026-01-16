// scripts/legislation-reps-scraper.js
// Purpose: Scrape House legislation (bills + resolutions) for the 119th Congress
// Enriches representatives-rankings.json with sponsor/cosponsor counts and became-law tallies

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const OUT_PATH = path.join(__dirname, '..', 'public', 'representatives-rankings.json');
const API_KEY = process.env.CONGRESS_API_KEY;
const CONGRESS = 119;

// House bill types
const TYPES = ['hr', 'hres', 'hconres', 'hjres'];

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
  while (url) {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`Bad response ${res.status} for ${url}`);
      break;
    }
    const data = await res.json();
    results = results.concat(data.bills || data.amendments || []);
    url = data.pagination?.next_url
      ? `https://api.congress.gov${data.pagination.next_url}&api_key=${API_KEY}&format=json`
      : null;
  }
  return results;
}

async function fetchBillDetail(billUrl) {
  const detailUrl = `${billUrl}&api_key=${API_KEY}&format=json`;
  const res = await fetch(detailUrl);
  if (!res.ok) {
    console.error(`Bad bill detail ${res.status} for ${detailUrl}`);
    return null;
  }
  const data = await res.json();
  return data.bill;
}

async function fetchCosponsorsList(listUrl) {
  // Follow the cosponsors list URL across pages
  const url = `${listUrl}&api_key=${API_KEY}&format=json`;
  return await fetchAllPages(url);
}

async function fetchHouseAmendments() {
  // Amendments are separate; filter to House-origin amendments in the 119th Congress
  const base = `https://api.congress.gov/v3/amendment/${CONGRESS}?api_key=${API_KEY}&format=json&pageSize=250&offset=0`;
  return await fetchAllPages(base);
}

(async function main() {
  if (!API_KEY) {
    console.error('Missing CONGRESS_API_KEY');
    process.exit(1);
  }

  const reps = JSON.parse(fs.readFileSync(OUT_PATH, 'utf-8')).map(ensureLegislationShape);
  const repMap = new Map(reps.map(r => [r.bioguideId, r]));

  let attached = 0;

  // Bills + resolutions
  for (const type of TYPES) {
    let url = `https://api.congress.gov/v3/bill/${CONGRESS}/${type}?api_key=${API_KEY}&format=json&pageSize=250&offset=0`;
    const bills = await fetchAllPages(url);

    for (const bill of bills) {
      const detail = await fetchBillDetail(bill.url);
      if (!detail) continue;

      // Sponsors: array or single object
      const sponsors = Array.isArray(detail.sponsors) ? detail.sponsors : (detail.sponsors ? [detail.sponsors] : []);
      for (const s of sponsors) {
        const id = s.bioguideId;
        if (id && repMap.has(id)) {
          repMap.get(id).sponsoredBills++;
          attached++;
        }
      }

      // Cosponsors: detail may include items and/or a list URL—follow both
      const inlineCosponsors = detail.cosponsors?.items || [];
      for (const c of inlineCosponsors) {
        const id = c.bioguideId;
        if (id && repMap.has(id)) {
          repMap.get(id).cosponsoredBills++;
          attached++;
        }
      }

      if (detail.cosponsors?.url) {
        const list = await fetchCosponsorsList(detail.cosponsors.url);
        for (const c of list) {
          const id = c.bioguideId;
          if (id && repMap.has(id)) {
            repMap.get(id).cosponsoredBills++;
            attached++;
          }
        }
      }

      // Became law: check latest status
      const becameLaw = (detail.latestAction?.action?.toLowerCase() || '').includes('became public law');
      if (becameLaw) {
        for (const s of sponsors) {
          const id = s.bioguideId;
          if (id && repMap.has(id)) repMap.get(id).becameLawBills++;
        }
      }
    }
  }

  // Amendments (House-origin)
  const amendments = await fetchHouseAmendments();
  for (const am of amendments) {
    // Fetch amendment detail for sponsors/cosponsors and status
    const detailUrl = `${am.url}&api_key=${API_KEY}&format=json`;
    const res = await fetch(detailUrl);
    if (!res.ok) continue;
    const data = await res.json();
    const amd = data.amendment;

    const sponsors = Array.isArray(amd.sponsors) ? amd.sponsors : (amd.sponsors ? [amd.sponsors] : []);
    for (const s of sponsors) {
      const id = s.bioguideId;
      if (id && repMap.has(id)) {
        repMap.get(id).sponsoredAmendments++;
        attached++;
      }
    }

    const inlineCosponsors = amd.cosponsors?.items || [];
    for (const c of inlineCosponsors) {
      const id = c.bioguideId;
      if (id && repMap.has(id)) {
        repMap.get(id).cosponsoredAmendments++;
        attached++;
      }
    }

    if (amd.cosponsors?.url) {
      const list = await fetchCosponsorsList(amd.cosponsors.url);
      for (const c of list) {
        const id = c.bioguideId;
        if (id && repMap.has(id)) {
          repMap.get(id).cosponsoredAmendments++;
          attached++;
        }
      }
    }

    const becameLaw = (amd.latestAction?.action?.toLowerCase() || '').includes('became public law');
    if (becameLaw) {
      for (const s of sponsors) {
        const id = s.bioguideId;
        if (id && repMap.has(id)) repMap.get(id).becameLawAmendments++;
      }
      for (const c of inlineCosponsors) {
        const id = c.bioguideId;
        if (id && repMap.has(id)) repMap.get(id).becameLawCosponsoredAmendments++;
      }
    }
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(reps, null, 2));
  console.log(`Updated representatives-rankings.json with legislation + amendments (${attached} entries attached)`);
})();
