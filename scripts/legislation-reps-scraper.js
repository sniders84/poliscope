const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const REPS_PATH = path.join(__dirname, '../public/representatives-rankings.json');

async function run() {
  let reps = JSON.parse(fs.readFileSync(REPS_PATH, 'utf8'));

  // Reset counters
  reps.forEach(rep => {
    rep.sponsoredBills = 0;
    rep.cosponsoredBills = 0;
    rep.sponsoredAmendments = 0;
    rep.cosponsoredAmendments = 0;
  });

  // TODO: Replace with real Congress.gov API calls keyed by bioguideId
  // For now, leave counters at 0 until API integration is wired in.

  fs.writeFileSync(REPS_PATH, JSON.stringify(reps, null, 2));
  console.log(`Updated representatives-rankings.json with legislation data for ${reps.length} representatives`);
}

run().catch(err => {
  console.error('House legislation scraper failed:', err);
  process.exit(1);
});
