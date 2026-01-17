const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');

const RANKINGS_PATH = path.join(__dirname, '../public/representatives-rankings.json');
const URL = 'https://www.congress.gov/sponsors-cosponsors/119th-congress/representatives/ALL';

async function scrape() {
  const { data } = await axios.get(URL);
  const $ = cheerio.load(data);
  const reps = JSON.parse(fs.readFileSync(RANKINGS_PATH, 'utf8'));

  $('table tbody tr').each((i, row) => {
    const cells = $(row).find('td');
    if (cells.length >= 6) {
      const name = $(cells[0]).text().trim();
      const state = $(cells[2]).text().trim();
      const sponsored = parseInt($(cells[3]).text().trim(), 10) || 0;
      const cosponsored = parseInt($(cells[4]).text().trim(), 10) || 0;
      const amendments = parseInt($(cells[5]).text().trim(), 10) || 0;

      const rep = reps.find(r => r.name.includes(name) && r.state === state);
      if (rep) {
        rep.sponsoredBills = sponsored;
        rep.cosponsoredBills = cosponsored;
        rep.sponsoredAmendments = amendments;
      }
    }
  });

  fs.writeFileSync(RANKINGS_PATH, JSON.stringify(reps, null, 2));
  console.log(`Updated sponsor/cosponsor tallies for ${reps.length} representatives`);
}

scrape().catch(err => {
  console.error('Congress.gov scrape failed:', err);
  process.exitCode = 1;
});
