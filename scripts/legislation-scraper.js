// Career totals scraper using GovTrack bulk data
// Fetches sponsored/cosponsored counts keyed by bioguide

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const OUT_PATH = path.join(__dirname, '../public/senators-rankings.json');

async function fetchGovTrackData() {
  const url = 'https://www.govtrack.us/data/congress-legislators/legislators-historical.json';
  const resp = await axios.get(url, { timeout: 60000 });
  return resp.data;
}

function ensureSchema(sen) {
  sen.sponsoredBills ??= 0;
  sen.cosponsoredBills ??= 0;
  sen.becameLawBills ??= 0;
  sen.becameLawCosponsoredBills ??= 0;
  return sen;
}

(async () => {
  const sens = JSON.parse(fs.readFileSync(OUT_PATH, 'utf-8')).map(ensureSchema);

  console.log('Fetching GovTrack bulk data...');
  const govtrack = await fetchGovTrackData();

  // Build bioguide -> totals map
  const totals = {};
  for (const leg of govtrack) {
    if (leg.id?.bioguide) {
      totals[leg.id.bioguide] = {
        sponsored: leg.sponsored_bills || 0,
        cosponsored: leg.cosponsored_bills || 0
      };
    }
  }

  for (const sen of sens) {
    const t = totals[sen.bioguideId];
    if (t) {
      sen.sponsoredBills = t.sponsored;
      sen.cosponsoredBills = t.cosponsored;
      sen.becameLawBills = 0; // GovTrack doesn’t break this out
      sen.becameLawCosponsoredBills = 0;
      console.log(`${sen.name}: sponsored=${t.sponsored}, cosponsored=${t.cosponsored}`);
    } else {
      console.warn(`No GovTrack totals found for ${sen.name} (${sen.bioguideId})`);
    }
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(sens, null, 2));
  console.log('Senate legislation updated with career totals (via GovTrack)');
})();
