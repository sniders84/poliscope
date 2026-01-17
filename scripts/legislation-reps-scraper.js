// scripts/legislation-reps-scraper.js
// Scrape aggregate sponsors/cosponsors ALL page for House in 119th Congress
// Uniform with Senate version - single request, fast, no API key

const fs = require('fs');
const path = require('path');            // <-- add path for consistency
const cheerio = require('cheerio');
const fetch = require('node-fetch');

const RANKINGS_PATH = path.join(__dirname, '../public/representatives-rankings.json');
const ALL_URL = 'https://www.congress.gov/sponsors-cosponsors/119th-congress/representatives/ALL';

async function scrapeHouseAggregate() {
  console.log(`Fetching House sponsors/cosponsors aggregate: ${ALL_URL}`);

  try {
    const res = await fetch(ALL_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://www.congress.gov/'
      }
    });

    console.log(`Status: ${res.status} ${res.statusText}`);
    if (!res.ok) {
      console.error(`Failed to fetch House aggregate page: ${res.status}`);
      return;
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    const table = $('table').first();
    if (!table.length) {
      console.error('No table found on House ALL page');
      return;
    }

    let updated = 0;
    let reps;

    try {
      reps = JSON.parse(fs.readFileSync(RANKINGS_PATH, 'utf8'));
    } catch (err) {
      console.error('Failed to load representatives-rankings.json:', err.message);
      return;
    }

    table.find('tr').each((i, row) => {
      if (i === 0) return; // skip header

      const cells = $(row).find('td');
      if (cells.length < 4) return;

      const nameLink = cells.eq(0).find('a');
      const nameText = nameLink.text().trim();
      const memberUrl = nameLink.attr('href') || '';
      const bioguideMatch = memberUrl.match(/\/([A-Z0-9]{7})\?/);
      const bioguide = bioguideMatch ? bioguideMatch[1] : null;

      const sponsored = parseInt(cells.eq(1).text().trim(), 10) || 0;
      const sponsoredAmd = parseInt(cells.eq(2).text().trim(), 10) || 0;
      const cosponsored = parseInt(cells.eq(3).text().trim(), 10) || 0;

      if (bioguide) {
        const rep = reps.find(r => r.bioguideId === bioguide);
        if (rep) {
          rep.sponsoredBills = sponsored;
          rep.sponsoredAmendments = sponsoredAmd;
          rep.cosponsoredBills = cosponsored;
          rep.cosponsoredAmendments = 0; // no cosponsored amendments column
          rep.becameLawBills = 0;        // no enactment data on aggregate page
          rep.becameLawCosponsoredBills = 0;
          rep.becameLawAmendments = 0;
          rep.becameLawCosponsoredAmendments = 0;

          console.log(`Updated ${rep.name} (${bioguide}): ${sponsored} sponsored, ${cosponsored} cosponsored`);
          updated++;
        } else {
          console.log(`No match for ${nameText} (bioguide: ${bioguide})`);
        }
      }
    });

    fs.writeFileSync(RANKINGS_PATH, JSON.stringify(reps, null, 2));
    console.log(`House aggregate scraping complete - updated ${updated} representatives`);

  } catch (err) {
    console.error('Scrape error:', err.message);
  }
}

scrapeHouseAggregate();
