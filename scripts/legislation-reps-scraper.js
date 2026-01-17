// scripts/legislation-reps-scraper.js
// Purpose: Scrape House legislation (bills + amendments) for the 119th Congress
// Enriches representatives-rankings.json with sponsor/cosponsor counts and became-law tallies
// Covers: sponsoredBills, cosponsoredBills, sponsoredAmendments, cosponsoredAmendments,
//         becameLawBills, becameLawCosponsoredBills, becameLawAmendments, becameLawCosponsoredAmendments
// Also attaches durable Congress.gov URLs for attribution

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
  rep.becameLawCosponsoredBills ??= 0;
  rep.becameLawAmendments ??= 0;
  rep.becameLawCosponsoredAmendments ??= 0;
  rep.legislationUrls ??= []; // durable Congress.gov links
  return rep;
}

async function fetchAllPages(url, key) {
  let results = [];
  let firstPayload = null;
  while (url) {
    const res = await fetch(url);
    if (!res.ok) break;
    const data = await res.json();
    if (!firstPayload) firstPayload = data;
    results = results.concat(data[key] || []);
    url = data.pagination?.next
      ? `${data.pagination.next}&api_key=${API_KEY}`
      : null;
  }
  return { results, firstPayload };
}

async function fetchDetail(url) {
  const sep = url.includes('?') ? '&' : '?';
  const res = await fetch(`${url}${sep}api_key=${API_KEY}`);
  if (!res.ok) return null;
  return await res.json();
}

function isBecameLawText(txt) {
  return (txt || '').toLowerCase().includes('became public law');
}

function durableBillUrl(congress, type, number) {
  const chamber = type.startsWith('H') ? 'house' : 'senate';
  let billType = '';
  if (type.startsWith('HR')) billType = 'bill';
  else if (type.startsWith('HJRES')) billType = 'joint-resolution';
  else if (type.startsWith('HRES')) billType = 'resolution';
  else if (type.startsWith('HCONRES')) billType = 'concurrent-resolution';
  else billType = 'bill';
  return `https://www.congress.gov/bill/${congress}th-congress/${chamber}-${billType}/${number}`;
}

function durableAmendmentUrl(congress, type, number) {
  const chamber = type.startsWith('H') ? 'house' : 'senate';
  return `https://www.congress.gov/amendment/${congress}th-congress/${chamber}-amendment/${number}`;
}

(async function main() {
  if (!API_KEY) {
    console.error('Missing CONGRESS_API_KEY');
    process.exit(1);
  }

  const reps = JSON.parse(fs.readFileSync(OUT_PATH, 'utf-8')).map(ensureLegislationShape);
  const repMap = new Map(reps.map(r => [r.bioguideId, r]));

  let attached = 0;

  // Bills
  const { results: bills, firstPayload: billsPayload } = await fetchAllPages(
    `https://api.congress.gov/v3/bill/${CONGRESS}?api_key=${API_KEY}&format=json&pageSize=250&offset=0`,
    'bills'
  );
  if (bills.length === 0) {
    console.log('DEBUG raw bill API response:');
    console.log(JSON.stringify(billsPayload, null, 2));
  }
  for (const bill of bills) {
    const detail = await fetchDetail(bill.url);
    if (!detail) continue;

    const latestText = detail.latestAction?.text || bill.latestAction?.text || '';
    const sponsorId = detail.sponsor?.bioguideId || detail.sponsor?.bioguide_id;

    // Sponsored bills
    if (sponsorId && repMap.has(sponsorId)) {
      const rep = repMap.get(sponsorId);
      rep.sponsoredBills++;
      if (isBecameLawText(latestText)) rep.becameLawBills++;
      rep.legislationUrls.push(durableBillUrl(CONGRESS, bill.type, bill.number));
      attached++;
    }

    // Cosponsored bills
    if (Array.isArray(detail.cosponsors)) {
      for (const c of detail.cosponsors) {
        const cosponsorId = c.bioguideId || c.bioguide_id;
        if (cosponsorId && repMap.has(cosponsorId)) {
          const rep = repMap.get(cosponsorId);
          rep.cosponsoredBills++;
          if (isBecameLawText(latestText)) rep.becameLawCosponsoredBills++;
          rep.legislationUrls.push(durableBillUrl(CONGRESS, bill.type, bill.number));
          attached++;
        }
      }
    }
  }

  // Amendments
  const { results: amendments, firstPayload: amendmentsPayload } = await fetchAllPages(
    `https://api.congress.gov/v3/amendment/${CONGRESS}?api_key=${API_KEY}&format=json&pageSize=250&offset=0`,
    'amendments'
  );
  if (amendments.length === 0) {
    console.log('DEBUG raw amendment API response:');
    console.log(JSON.stringify(amendmentsPayload, null, 2));
  }
  for (const amendment of amendments) {
    const detail = await fetchDetail(amendment.url);
    if (!detail) continue;

    const latestText = detail.latestAction?.text || amendment.latestAction?.text || '';
    const sponsorId = detail.sponsor?.bioguideId || detail.sponsor?.bioguide_id;

    // Sponsored amendments
    if (sponsorId && repMap.has(sponsorId)) {
      const rep = repMap.get(sponsorId);
      rep.sponsoredAmendments++;
      if (isBecameLawText(latestText)) rep.becameLawAmendments++;
      rep.legislationUrls.push(durableAmendmentUrl(CONGRESS, amendment.type, amendment.number));
      attached++;
    }

    // Cosponsored amendments
    if (Array.isArray(detail.cosponsors)) {
      for (const c of detail.cosponsors) {
        const cosponsorId = c.bioguideId || c.bioguide_id;
        if (cosponsorId && repMap.has(cosponsorId)) {
          const rep = repMap.get(cosponsorId);
          rep.cosponsoredAmendments++;
          if (isBecameLawText(latestText)) rep.becameLawCosponsoredAmendments++;
          rep.legislationUrls.push(durableAmendmentUrl(CONGRESS, amendment.type, amendment.number));
          attached++;
        }
      }
    }
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(reps, null, 2));
  console.log(`Updated representatives-rankings.json with legislation + amendments (${attached} entries attached)`);
})();
