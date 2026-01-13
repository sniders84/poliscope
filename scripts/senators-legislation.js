// scripts/senators-legislation.js
// API-based (no HTML scraping). Pulls sponsored & cosponsored counts per senator from Congress.gov API.
// Requires each senator in public/senators-rankings.json to have a bioguideId (e.g., "B001310").
// Writes four top-level fields per senator:
//   sponsoredLegislation, sponsoredAmendments, cosponsoredLegislation, cosponsoredAmendments

const fs = require('fs');
const fetch = require('node-fetch');

const OUTPUT = 'public/senators-rankings.json';
const CONGRESS = 119;
const API_BASE = 'https://api.congress.gov/v3';
const API_KEY = process.env.CONGRESS_API_KEY;

if (!API_KEY) {
  console.error('Missing CONGRESS_API_KEY environment variable.');
  process.exit(1);
}

const base = JSON.parse(fs.readFileSync(OUTPUT, 'utf8'));

function normalizeType(t) {
  const s = String(t || '').toLowerCase();
  if (s.includes('amendment')) return 'amendment';
  // Congress.gov types include "bill", "resolution", "joint resolution", "concurrent resolution"
  return 'legislation';
}

async function fetchAllPages(url) {
  // Congress.gov API paginates; follow "next" links until exhausted
  const results = [];
  let nextUrl = url;

  while (nextUrl) {
    const res = await fetch(nextUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) throw new Error(`API fetch failed ${res.status} for ${nextUrl}`);
    const data = await res.json();

    const items = data?.data || data?.results || [];
    if (Array.isArray(items)) results.push(...items);

    // Congress.gov uses "pagination.next" or "next" depending on endpoint version
    const next = data?.pagination?.next || data?.next || null;
    nextUrl = next ? `${API_BASE}${next}&api_key=${API_KEY}` : null;
  }

  return results;
}

async function countForMember(bioguideId) {
  // Sponsored
  const sponsoredUrl = `${API_BASE}/member/${bioguideId}/sponsored-legislation?congress=${CONGRESS}&api_key=${API_KEY}`;
  const sponsoredItems = await fetchAllPages(sponsoredUrl);

  let sponsoredLegislation = 0;
  let sponsoredAmendments = 0;

  sponsoredItems.forEach(item => {
    const type = normalizeType(item?.type || item?.bill_type || item?.document_type);
    if (type === 'amendment') sponsoredAmendments += 1;
    else sponsoredLegislation += 1;
  });

  // Cosponsored
  const cosponsoredUrl = `${API_BASE}/member/${bioguideId}/cosponsored-legislation?congress=${CONGRESS}&api_key=${API_KEY}`;
  const cosponsoredItems = await fetchAllPages(cosponsoredUrl);

  let cosponsoredLegislation = 0;
  let cosponsoredAmendments = 0;

  cosponsoredItems.forEach(item => {
    const type = normalizeType(item?.type || item?.bill_type || item?.document_type);
    if (type === 'amendment') cosponsoredAmendments += 1;
    else cosponsoredLegislation += 1;
  });

  return {
    sponsoredLegislation,
    sponsoredAmendments,
    cosponsoredLegislation,
    cosponsoredAmendments
  };
}

async function main() {
  let updated = 0, skipped = 0, failed = 0;

  for (const sen of base) {
    const bioguideId = sen.bioguideId || sen.bioguide || sen.bioguide_id;
    if (!bioguideId) {
      skipped++;
      continue;
    }
    try {
      const counts = await countForMember(bioguideId);
      sen.sponsoredLegislation = counts.sponsoredLegislation;
      sen.sponsoredAmendments = counts.sponsoredAmendments;
      sen.cosponsoredLegislation = counts.cosponsoredLegislation;
      sen.cosponsoredAmendments = counts.cosponsoredAmendments;
      updated++;
      // small delay to be polite to API
      await new Promise(r => setTimeout(r, 200));
    } catch (e) {
      failed++;
      console.error(`Member ${sen.name} (${bioguideId}) failed: ${e.message}`);
    }
  }

  fs.writeFileSync(OUTPUT, JSON.stringify(base, null, 2));
  console.log(`Legislation counts updated. Updated: ${updated}, Skipped (no bioguideId): ${skipped}, Failed: ${failed}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
