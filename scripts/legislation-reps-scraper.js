// scripts/legislation-reps-scraper.js
// Bare-bones HTML scraper from congress.gov member profiles
// Gets sponsored bills, cosponsored bills, and became law counts (combined)

const fs = require('fs');
const cheerio = require('cheerio');
const fetch = require('node-fetch');

const RANKINGS_PATH = 'public/representatives-rankings.json';
const DELAY_MS = 4000; // 4 seconds per rep - be nice to congress.gov
const CHECKPOINT_INTERVAL = 10;

let reps = [];
try {
  reps = JSON.parse(fs.readFileSync(RANKINGS_PATH, 'utf8'));
} catch (err) {
  console.error('Failed to load rankings.json:', err.message);
  process.exit(1);
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrapeRep(rep) {
  const name = rep.name.replace(/\s+/g, '-').toLowerCase();
  const bioguide = rep.bioguideId;
  const url = `https://www.congress.gov/member/${name}/${bioguide}?searchResultViewType=expanded`;

  console.log(`Scraping profile for ${rep.name} (${bioguide}) → ${url}`);

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PoliscopeBot/1.0)' }
    });
    if (!res.ok) {
      console.error(`HTTP ${res.status} for ${rep.name}`);
      return rep;
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    let sponsored = 0;
    let cosponsored = 0;
    let becameLaw = 0;

    // Sponsored Legislation table
    $('div#SponsoredLegislation table tr').each((i, row) => {
      if (i === 0) return; // skip header
      sponsored++;
      const action = $(row).find('td').last().text().trim().toLowerCase();
      if (action.includes('became public law') || action.includes('signed by president')) {
        becameLaw++;
      }
    });

    // Cosponsored Legislation table
    $('div#CosponsoredLegislation table tr').each((i, row) => {
      if (i === 0) return; // skip header
      cosponsored++;
      const action = $(row).find('td').last().text().trim().toLowerCase();
      if (action.includes('became public law') || action.includes('signed by president')) {
        becameLaw++;
      }
    });

    rep.sponsoredBills = sponsored;
    rep.cosponsoredBills = cosponsored;
    rep.becameLawBills = becameLaw;
    rep.becameLawCosponsoredBills = 0; // separate if you want later
    rep.sponsoredAmendments = 0;
    rep.cosponsoredAmendments = 0;
    rep.becameLawAmendments = 0;
    rep.becameLawCosponsoredAmendments = 0;

    console.log(`→ ${rep.name}: ${sponsored} sponsored, ${cosponsored} cosponsored, ${becameLaw} became law`);

  } catch (err) {
    console.error(`Error scraping ${rep.name}: ${err.message}`);
  }

  return rep;
}

(async () => {
  let processed = 0;
  for (const rep of reps) {
    await scrapeRep(rep);
    processed++;
    if (processed % CHECKPOINT_INTERVAL === 0) {
      fs.writeFileSync(RANKINGS_PATH, JSON.stringify(reps, null, 2));
      console.log(`Checkpoint: ${processed} reps updated`);
    }
    await delay(DELAY_MS); // polite delay
  }

  // Final save
  fs.writeFileSync(RANKINGS_PATH, JSON.stringify(reps, null, 2));
  console.log('Legislation scraping complete (HTML profiles)');
})();
