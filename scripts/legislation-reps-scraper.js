// scripts/legislation-reps-scraper.js
// Purpose: Scrape House legislation (bills + amendments) for the 119th Congress
// Enriches representatives-rankings.json with sponsor/cosponsor counts and became-law tallies
// Uses bill-centric endpoints and reads from `results`
// Includes unconditional debug logging for raw bill and amendment responses

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

async function fetchAllPages(url) {
  let results = [];
  let firstPayload = null;
  while (url) {
    const res = await fetch(url);
    if (!res.ok) break;
    const data = await res.json();
    if (!firstPayload) firstPayload = data;
    results = results.concat(data.results || []);
    url = data.pagination?.next_url
      ? `https://api.congress.gov${data.pagination.next_url}&api_key=${API_KEY}&format=json`
      : null;
  }
  return { results, firstPayload };
}

async function fetchBills() {
  const url = `https://api.congress.gov/v3/bill/${CONGRESS}?api_key=${API_KEY}&format=json&pageSize=250&offset=0`;
  return await fetchAllPages(url);
}

async function fetchAmendments() {
  const url = `https://api.congress.gov/v3/amendment/${CONGRESS}?api_key=${API_KEY}&format=json&pageSize=250&offset=0`;
  return await fetchAllPages(url);
}

(async function main() {
  if (!API_KEY) {
    console.error('Missing CONGRESS_API_KEY');
    process.exit(1);
  }

  const reps = JSON.parse(fs.readFileSync(OUT_PATH, 'utf-8')).map(ensureLegislationShape);
  const repMap = new Map(reps.map(r => [r.bioguideId, r]));

  let attached = 0;

  // Process bills
  const { results: bills, firstPayload: billsPayload } = await fetchBills();
  if (bills.length === 0) {
    console.log('DEBUG raw bill API response:');
    console.log(JSON.stringify(billsPayload, null, 2));
  }
  for (const bill of bills) {
    const sponsorId = bill.sponsor?.bioguideId || bill.sponsor?.bioguide_id;
    if (sponsorId && repMap.has(sponsorId)) {
      const rep = repMap.get(sponsorId);
      rep.sponsoredBills++;
      if ((bill.latestAction?.action || '').toLowerCase().includes('became public law')) {
        rep.becameLawBills++;
      }
      attached++;
    }
    if (bill.cosponsors) {
      for (const c of bill.cosponsors) {
        const cosponsorId = c.bioguideId || c.bioguide_id;
        if (cosponsorId && repMap.has(cosponsorId)) {
          const rep = repMap.get(cosponsorId);
          rep.cosponsoredBills++;
          attached++;
        }
      }
    }
  }

  // Process amendments
  const { results: amendments, firstPayload: amendmentsPayload } = await fetchAmendments();
  if (amendments.length === 0) {
    console.log('DEBUG raw amendment API response:');
    console.log(JSON.stringify(amendmentsPayload, null, 2));
  }
  for (const amendment of amendments) {
    const sponsorId = amendment.sponsor?.bioguideId || amendment.sponsor?.bioguide_id;
    if (sponsorId && repMap.has(sponsorId)) {
      const rep = repMap.get(sponsorId);
      rep.sponsoredAmendments++;
      if ((amendment.latestAction?.action || '').toLowerCase().includes('became public law')) {
        rep.becameLawAmendments++;
      }
      attached++;
    }
    if (amendment.cosponsors) {
      for (const c of amendment.cosponsors) {
        const cosponsorId = c.bioguideId || c.bioguide_id;
        if (cosponsorId && repMap.has(cosponsorId)) {
          const rep = repMap.get(cosponsorId);
          rep.cosponsoredAmendments++;
          if ((amendment.latestAction?.action || '').toLowerCase().includes('became public law')) {
            rep.becameLawCosponsoredAmendments++;
          }
          attached++;
        }
      }
    }
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(reps, null, 2));
  console.log(`Updated representatives-rankings.json with legislation + amendments (${attached} entries attached)`);
})();
