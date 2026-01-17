// scripts/legislation-reps-scraper.js
// Purpose: Scrape House legislation counts directly from Congress.gov member profile pages
// Enriches representatives-rankings.json with sponsor/cosponsor counts and durable URLs
// Covers: sponsoredBills, cosponsoredBills, sponsoredAmendments, cosponsoredAmendments,
//         becameLawBills, becameLawCosponsoredBills, becameLawAmendments, becameLawCosponsoredAmendments
// Became-law fields left at 0 for speed (require deeper detail crawl)

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const cheerio = require('cheerio'); // HTML parser

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
  rep.legislationUrls ??= []; // durable Congress.gov links
  return rep;
}

// Construct durable Congress.gov profile URL
function memberProfileUrl(bioguideId) {
  return `https://www.congress.gov/member/${bioguideId}?congress=${CONGRESS}`;
}

async function scrapeProfile(rep) {
  const url = memberProfileUrl(rep.bioguideId);
  const res = await fetch(url);
  if (!res.ok) return null;
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

  // Durable URLs for attribution
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
