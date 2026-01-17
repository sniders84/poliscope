// scripts/legislation-reps-scraper.js
// Bare-bones HTML scraper from congress.gov member profiles with 119th filter
// Sponsored, cosponsored, and became law counts

const fs = require('fs');
const cheerio = require('cheerio');
const fetch = require('node-fetch');

const RANKINGS_PATH = 'public/representatives-rankings.json';
const DELAY_MS = 10000; // 10 seconds per rep - very polite
const CHECKPOINT_INTERVAL = 5; // Save every 5 reps

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
  const nameSlug = rep.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const url = `https://www.congress.gov/member/${nameSlug}/${rep.bioguideId}?q=%7B%22congress%22%3A%22119%22%7D`;

  console.log(`Scraping 119th profile for ${rep.name} (${rep.bioguideId}) → ${url}`);

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://www.congress.gov/',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });

    console.log(`Status for ${rep.name}: ${res.status} ${res.statusText}`);

    if (!res.ok) {
      if (res.status === 403) {
        console.error(`403 Forbidden - likely bot detection on ${rep.name}`);
      }
      return rep;
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    let sponsored = 0;
    let cosponsored = 0;
    let becameLaw = 0;

    // Sponsored Legislation table
    $('.legislation-table tr').each((i, row) => {
      if (i === 0) return; // header
      const tds = $(row).find('td');
      if (tds.length < 3) return;
      sponsored++;
      const action = tds.eq(-1).text().trim().toLowerCase();
      if (action.includes('became public law') || action.includes('signed by president') || action.includes('enacted')) {
        becameLaw++;
      }
    });

    // Cosponsored Legislation table (may be separate or same class - adjust selector if needed)
    $('.legislation-table tr').each((i, row) => {
      if (i === 0) return;
      const tds = $(row).find('td');
      if (tds.length < 3) return;
      cosponsored++;
      const action = tds.eq(-1).text().trim().toLowerCase();
      if (action.includes('became public law') || action.includes('signed by president') || action.includes('enacted')) {
        becameLaw++;
      }
    });

    rep.sponsoredBills = sponsored;
    rep.cosponsoredBills = cosponsored;
    rep.becameLawBills = becameLaw;
    rep.becameLawCosponsoredBills = 0; // separate if needed later
    rep.sponsoredAmendments = 0;
    rep.cosponsoredAmendments = 0;
    rep.becameLawAmendments = 0;
    rep.becameLawCosponsoredAmendments = 0;

    console.log(`→ ${rep.name}: ${sponsored} sponsored, ${cosponsored} cosponsored, ${becameLaw} became law`);

  } catch (err) {
    console.error(`Error on ${rep.name}: ${err.message}`);
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
    await delay(DELAY_MS);
  }

  fs.writeFileSync(RANKINGS_PATH, JSON.stringify(reps, null, 2));
  console.log('119th Congress HTML profile scraping complete');
})();
