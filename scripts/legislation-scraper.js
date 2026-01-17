// scripts/legislation-scraper.js
// Scrape aggregate sponsors/cosponsors ALL page for Senate in 119th Congress
// Uniform with House version - single request, fast, no API key

const fs = require('fs');
const cheerio = require('cheerio');
const fetch = require('node-fetch');

const RANKINGS_PATH = path.join(__dirname, '../public/senators-rankings.json');
const ALL_URL = 'https://www.congress.gov/sponsors-cosponsors/119th-congress/senators/ALL';

async function scrapeSenateAggregate() {
  console.log(`Fetching Senate sponsors/cosponsors aggregate: ${ALL_URL}`);

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
      console.error(`Failed to fetch Senate aggregate page: ${res.status}`);
      return;
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    // Find the main table (likely .table or #content table)
    const table = $('table').first();
    if (!table.length) {
      console.error('No table found on Senate ALL page');
      return;
    }

    let updated = 0;

    table.find('tr').each((i, row) => {
      if (i === 0) return; // skip header

      const cells = $(row).find('td');
      if (cells.length < 5) return;

      const nameLink = cells.eq(0).find('a');
      const nameText = nameLink.text().trim();
      const memberUrl = nameLink.attr('href') || '';
      const bioguideMatch = memberUrl.match(/\/([A-Z0-9]{7})\?/);
      const bioguide = bioguideMatch ? bioguideMatch[1] : null;

      const sponsored = parseInt(cells.eq(1).text().trim(), 10) || 0;
      const sponsoredAmd = parseInt(cells.eq(2).text().trim(), 10) || 0;
      const cosponsored = parseInt(cells.eq(3).text().trim(), 10) || 0;
      // Original/Withdrawn in cells 4/5 if present

      if (bioguide) {
        let rankings;
        try {
          rankings = JSON.parse(fs.readFileSync(RANKINGS_PATH, 'utf8'));
        } catch (err) {
          console.error('Failed to load senators-rankings.json:', err.message);
          return;
        }

        const senator = rankings.find(s => s.bioguideId === bioguide);
        if (senator) {
          senator.sponsoredBills = sponsored;
          senator.cosponsoredBills = cosponsored;
          senator.sponsoredAmendments = sponsoredAmd;
          senator.cosponsoredAmendments = 0; // no cosponsored amd column
          senator.becameLawBills = 0;        // no enactment data on aggregate page
          senator.becameLawCosponsoredBills = 0;
          senator.becameLawAmendments = 0;
          senator.becameLawCosponsoredAmendments = 0;

          console.log(`Updated ${senator.name} (${bioguide}): ${sponsored} sponsored, ${cosponsored} cosponsored`);

          updated++;
        } else {
          console.log(`No match for ${nameText} (bioguide: ${bioguide})`);
        }

        // Save after each update (safe but slow; or batch)
        fs.writeFileSync(RANKINGS_PATH, JSON.stringify(rankings, null, 2));
      }
    });

    console.log(`Senate aggregate scraping complete - updated ${updated} senators`);

  } catch (err) {
    console.error('Scrape error:', err.message);
  }
}

scrapeSenateAggregate();
