// scripts/legislation-reps-scraper.js
// Purpose: Scrape House legislation counts directly from Congress.gov member profile pages
// Enriches representatives-rankings.json with sponsor/cosponsor counts and became-law tallies
// Covers: sponsoredBills, cosponsoredBills, sponsoredAmendments, cosponsoredAmendments,
//         becameLawBills, becameLawCosponsoredBills, becameLawAmendments, becameLawCosponsoredAmendments
// Also attaches durable Congress.gov URLs for attribution

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

const OUT_PATH = path.join(__dirname, '..', 'public', 'representatives-rankings.json');
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
  rep.legislationUrls ??= [];
  return rep;
}

// Build slug from name (lowercase, spaces -> hyphens)
function slugifyName(name) {
  return name.toLowerCase().replace(/[^a-z\s]/g, '').trim().replace(/\s+/g, '-');
}

function memberProfileUrl(rep) {
  const slug = slugifyName(rep.name || '');
  return `https://www.congress.gov/member/${slug}/${rep.bioguideId}?congress=${CONGRESS}`;
}

async function scrapeProfile(rep) {
  const url = memberProfileUrl(rep);
  const res = await fetch(url);
  if (!res.ok) {
    console.log(`Failed to fetch ${url} (${res.status})`);
    return null;
  }
  const html = await res.text();
  const $ = cheerio.load(html);

  const counts = {
    sponsoredBills: 0,
    cosponsoredBills: 0,
    sponsoredAmendments: 0,
    cosponsoredAmendments: 0,
    becameLawBills: 0,
    becameLawCosponsoredBills: 0,
    becameLawAmendments: 0,
    becameLawCosponsoredAmendments: 0,
    urls: []
  };

  // Sponsored bills
  const sponsoredText = $('a[href*="sponsored-legislation"]').text();
  const sponsoredMatch = sponsoredText.match(/\((\d+)\)/);
  if (sponsoredMatch) counts.sponsoredBills = parseInt(sponsoredMatch[1], 10);

  // Cosponsored bills
  const cosponsoredText = $('a[href*="cosponsored-legislation"]').text();
  const cosponsoredMatch = cosponsoredText.match(/\((\d+)\)/);
  if (cosponsoredMatch) counts.cosponsoredBills = parseInt(cosponsoredMatch[1], 10);

  // Amendments
  const amendmentText = $('a[href*="amendments"]').text();
  const amendMatch = amendmentText.match(/\((\d+)\)/);
  if (amendMatch) counts.sponsoredAmendments = parseInt(amendMatch[1], 10);

  // Became law filters (search results links include bill-status=law)
  const lawSponsoredText = $('a[href*="sponsored-legislation"][href*="bill-status=law"]').text();
  const lawSponsoredMatch = lawSponsoredText.match(/\((\d+)\)/);
  if (lawSponsoredMatch) counts.becameLawBills = parseInt(lawSponsoredMatch[1], 10);

  const lawCosponsoredText = $('a[href*="cosponsored-legislation"][href*="bill-status=law"]').text();
  const lawCosponsoredMatch = lawCosponsoredText.match(/\((\d+)\)/);
  if (lawCosponsoredMatch) counts.becameLawCosponsoredBills = parseInt(lawCosponsoredMatch[1], 10);

  const lawAmendText = $('a[href*="amendments"][href*="bill-status=law"]').text();
  const lawAmendMatch = lawAmendText.match(/\((\d+)\)/);
  if (lawAmendMatch) counts.becameLawAmendments = parseInt(lawAmendMatch[1], 10);

  // Durable URLs
  if (counts.sponsoredBills > 0) counts.urls.push(`${url}#sponsored-legislation`);
  if (counts.cosponsoredBills > 0) counts.urls.push(`${url}#cosponsored-legislation`);
  if (counts.sponsoredAmendments > 0) counts.urls.push(`${url}#amendments`);

  return counts;
}

(async function main() {
  const reps = JSON.parse(fs.readFileSync(OUT_PATH, 'utf-8')).map(ensureLegislationShape);
  let attached = 0;

  for (const rep of reps) {
    if (!rep.bioguideId) continue;
    const counts = await scrapeProfile(rep);
    if (!counts) continue;

    rep.sponsoredBills = counts.sponsoredBills;
    rep.cosponsoredBills = counts.cosponsoredBills;
    rep.sponsoredAmendments = counts.sponsoredAmendments;
    rep.cosponsoredAmendments = counts.cosponsoredAmendments;
    rep.becameLawBills = counts.becameLawBills;
    rep.becameLawCosponsoredBills = counts.becameLawCosponsoredBills;
    rep.becameLawAmendments = counts.becameLawAmendments;
    rep.becameLawCosponsoredAmendments = counts.becameLawCosponsoredAmendments;
    rep.legislationUrls.push(...counts.urls);

    attached++;
    console.log(`Updated ${rep.name || rep.bioguideId} with profile counts`);
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(reps, null, 2));
  console.log(`Updated representatives-rankings.json with profile legislation counts (${attached} profiles scraped)`);
})();
