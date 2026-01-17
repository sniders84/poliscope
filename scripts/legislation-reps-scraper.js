// scripts/legislation-reps-scraper.js
// Purpose: Fetch House legislation counts via Congress.gov API v3 for current members (119th Congress)
// Enriches representatives-rankings.json with sponsor/cosponsor counts and became-law tallies
// Covers: sponsoredBills, cosponsoredBills, sponsoredAmendments, cosponsoredAmendments,
//         becameLawBills, becameLawCosponsoredBills, becameLawAmendments, becameLawCosponsoredAmendments
// Uses member/sponsored-legislation and member/cosponsored-legislation endpoints (bills/resolutions only)
// Amendments: currently 0 (no direct API endpoint; can add HTML scraping fallback if needed)
// Also attaches durable Congress.gov profile URLs for attribution

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const OUT_PATH = path.join(__dirname, '..', 'public', 'representatives-rankings.json');
const CONGRESS = process.env.CONGRESS_NUMBER || '119';
const API_KEY = process.env.CONGRESS_API_KEY;

if (!API_KEY) {
  console.error('Missing CONGRESS_API_KEY environment variable. Set it in .env or GitHub Secrets.');
  process.exit(1);
}

const API_BASE = 'https://api.congress.gov/v3';
const FORMAT = 'json';
const MAX_LIMIT = 250; // API max per page

function ensureLegislationShape(rep) {
  rep.sponsoredBills ??= 0;
  rep.cosponsoredBills ??= 0;
  rep.sponsoredAmendments ??= 0;
  rep.cosponsoredAmendments ??= 0;
  rep.becameLawBills ??= 0;
  rep.becameLawCosponsoredBills ??= 0;
  rep.becameLawAmendments ??= 0;
  rep.becameLawCosponsoredAmendments ??= 0;
  rep.legislationUrls ??= [];
  return rep;
}

function slugifyName(name) {
  return (name || '').toLowerCase().replace(/[^a-z\s-]/g, '').trim().replace(/\s+/g, '-');
}

async function apiRequest(endpoint, params = {}) {
  const query = new URLSearchParams({
    api_key: API_KEY,
    format: FORMAT,
    ...params,
  });
  const url = `${API_BASE}${endpoint}?${query.toString()}`;
  
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'electorate.app scraper (contact via GitHub)' },
    });
    
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error(`API error: ${res.status} for ${url} → ${text.slice(0, 200)}`);
      return { success: false, data: null };
    }
    
    const data = await res.json();
    return { success: true, data };
  } catch (err) {
    console.error(`Fetch failed for ${url}: ${err.message}`);
    return { success: false, data: null };
  }
}

// Get total count without fetching full list
async function getCount(endpoint, extraParams = {}) {
  const { success, data } = await apiRequest(endpoint, { limit: 1, ...extraParams });
  if (!success || !data?.pagination) return 0;
  return data.pagination.count || 0;
}

// Fetch full paginated list (for became-law filtering)
async function getFullList(endpoint, extraParams = {}) {
  let items = [];
  let offset = 0;
  
  while (true) {
    const params = { limit: MAX_LIMIT, offset, ...extraParams };
    const { success, data } = await apiRequest(endpoint, params);
    if (!success || !data) break;
    
    const pageItems = data.bills || []; // member endpoints return { bills: [...] }
    items = items.concat(pageItems);
    
    if (pageItems.length < MAX_LIMIT) break;
    offset += MAX_LIMIT;
    
    // Optional: avoid hitting rate limits too hard (1000 req/hour)
    // await new Promise(r => setTimeout(r, 500));
  }
  
  return items;
}

function isBecamePublicLaw(item) {
  const actionText = item?.latestAction?.text || '';
  const hasLaw = !!(item?.laws?.length > 0);
  return actionText.includes('Became Public Law') || hasLaw;
}

async function scrapeProfile(rep) {
  if (!rep.bioguideId) {
    console.log(`Skipping ${rep.name || 'unknown'} - no bioguideId`);
    return null;
  }
  
  const bioguide = rep.bioguideId;
  const congressFilter = { congress: CONGRESS };
  
  console.log(`Scraping API for ${rep.name || bioguide} (${bioguide})...`);
  
  // Sponsored bills count + list for became-law
  const sponsoredCount = await getCount(`/member/${bioguide}/sponsored-legislation`, congressFilter);
  const sponsoredList = sponsoredCount > 0 
    ? await getFullList(`/member/${bioguide}/sponsored-legislation`, congressFilter)
    : [];
  const becameLawSponsored = sponsoredList.filter(isBecamePublicLaw).length;
  
  // Cosponsored bills count + list
  const cosponsoredCount = await getCount(`/member/${bioguide}/cosponsored-legislation`, congressFilter);
  const cosponsoredList = cosponsoredCount > 0 
    ? await getFullList(`/member/${bioguide}/cosponsored-legislation`, congressFilter)
    : [];
  const becameLawCosponsored = cosponsoredList.filter(isBecamePublicLaw).length;
  
  // Amendments not directly available via API → set to 0 for now
  const sponsoredAmendments = 0;
  const cosponsoredAmendments = 0;
  const becameLawAmendments = 0;
  const becameLawCosponsoredAmendments = 0;
  
  const counts = {
    sponsoredBills: sponsoredCount,
    cosponsoredBills: cosponsoredCount,
    sponsoredAmendments,
    cosponsoredAmendments,
    becameLawBills: becameLawSponsored,
    becameLawCosponsoredBills: becameLawCosponsored,
    becameLawAmendments,
    becameLawCosponsoredAmendments,
    urls: []
  };
  
  // Build durable profile URLs for attribution
  const baseProfile = `https://www.congress.gov/member/${slugifyName(rep.name)}/${bioguide}`;
  if (sponsoredCount > 0 || becameLawSponsored > 0) {
    counts.urls.push(`${baseProfile}#sponsored-legislation`);
  }
  if (cosponsoredCount > 0 || becameLawCosponsored > 0) {
    counts.urls.push(`${baseProfile}#cosponsored-legislation`);
  }
  // If we later add amendments, add #amendments or search params
  
  console.log(`→ ${rep.name || bioguide}: ${sponsoredCount} sponsored, ${cosponsoredCount} cosponsored bills`);
  
  return counts;
}

(async function main() {
  let reps;
  try {
    reps = JSON.parse(fs.readFileSync(OUT_PATH, 'utf8')).map(ensureLegislationShape);
  } catch (err) {
    console.error(`Failed to read ${OUT_PATH}: ${err.message}`);
    process.exit(1);
  }
  
  let updated = 0;
  
  for (const rep of reps) {
    const counts = await scrapeProfile(rep);
    if (!counts) continue;
    
    Object.assign(rep, counts);
    // Merge URLs (avoid duplicates if run multiple times)
    rep.legislationUrls = [...new Set([...(rep.legislationUrls || []), ...counts.urls])];
    
    updated++;
    // Optional: write incrementally every 20 reps to avoid losing progress
    if (updated % 20 === 0) {
      fs.writeFileSync(OUT_PATH, JSON.stringify(reps, null, 2));
      console.log(`Checkpoint: ${updated} reps updated`);
    }
  }
  
  fs.writeFileSync(OUT_PATH, JSON.stringify(reps, null, 2));
  console.log(`Finished: Updated ${updated} representatives with API legislation data`);
})();
