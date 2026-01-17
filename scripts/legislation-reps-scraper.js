// scripts/legislation-reps-scraper.js
// Scrape aggregate sponsors-cosponsors table from congress.gov for 119th House reps
// Pulls sponsored/cosponsored counts directly; became-law requires per-profile (skipped for speed)

const fs = require('fs');
const cheerio = require('cheerio');
const fetch = require('node-fetch');

const RANKINGS_PATH = 'public/representatives-rankings.json';
const ALL_URL = 'https://www.congress.gov/sponsors-cosponsors/119th-congress/representatives/ALL';

let reps = [];
try {
  reps = JSON.parse(fs.readFileSync(RANKINGS_PATH, 'utf8'));
} catch (err) {
  console.error('Failed to load rankings.json:', err.message);
  process.exit(1);
}

// Map bioguideId → rep object for quick lookup
const repMap = new Map(reps.map(r => [r.bioguideId, r]));

async function scrapeAggregate() {
  console.log(`Fetching aggregate sponsors/cosponsors page: ${ALL_URL}`);

  try {
    const res = await fetch(ALL_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://www.congress.gov/'
      }
    });

    console.log(`Status: ${res.status} ${res.statusText}`);

    if (!res.ok) {
      console.error(`Failed to fetch aggregate page: ${res.status}`);
      return;
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    // Find the table (likely .table or #content table)
    const table = $('table').first(); // adjust if multiple tables
    if (!table.length) {
      console.error('No table found on page');
      return;
    }

    table.find('tr').each((i, row) => {
      if (i === 0) return; // skip header

      const cells = $(row).find('td');
      if (cells.length < 5) return;

      const nameLink = cells.eq(0).find('a');
      const nameText = nameLink.text().trim();
      const memberUrl = nameLink.attr('href') || '';
      const bioguideMatch = memberUrl.match(/\/([A-Z0-9]{7})\?/); // e.g. /H000874?
      const bioguide = bioguideMatch ? bioguideMatch[1] : null;

      const sponsored = parseInt(cells.eq(1).text().trim(), 10) || 0;
      const sponsoredAmd = parseInt(cells.eq(2).text().trim(), 10) || 0;
      const cosponsored = parseInt(cells.eq(3).text().trim(), 10) || 0;
      // Original/Withdrawn in eq(4) and eq(5) if present

      if (bioguide && repMap.has(bioguide)) {
        const rep = repMap.get(bioguide);
        rep.sponsoredBills = sponsored;
        rep.cosponsoredBills = cosponsored;
        rep.sponsoredAmendments = sponsoredAmd;
        rep.cosponsoredAmendments = 0; // no cosponsored amd column
        rep.becameLawBills = 0; // no data here - needs per-profile
        rep.becameLawCosponsoredBills = 0;
        rep.becameLawAmendments = 0;
        rep.becameLawCosponsoredAmendments = 0;

        console.log(`Updated ${rep.name} (${bioguide}): ${sponsored} sponsored, ${cosponsored} cosponsored`);
      } else {
        console.log(`No match for ${nameText} (bioguide: ${bioguide || 'missing'})`);
      }
    });

    fs.writeFileSync(RANKINGS_PATH, JSON.stringify(reps, null, 2));
    console.log('Aggregate sponsors/cosponsors updated from ALL page');

  } catch (err) {
    console.error('Scrape error:', err.message);
  }
}

scrapeAggregate();
