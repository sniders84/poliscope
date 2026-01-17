const fs = require('fs');

let reps = [];
try {
  reps = JSON.parse(fs.readFileSync('public/representatives-rankings.json', 'utf8'));
} catch (err) {
  console.error('Error loading rankings JSON:', err.message);
  process.exit(1);
}

const API_KEY = process.env.CONGRESS_API_KEY;
if (!API_KEY) {
  console.error('CONGRESS_API_KEY required');
  process.exit(1);
}

const CONGRESS = 119;
const LIMIT = 250;
const DELAY_MS = 600;
const CHECKPOINT_INTERVAL = 20;

async function fetchPaginated(urlBase) {
  let items = [];
  let offset = 0;
  while (true) {
    const url = `${urlBase}&limit=${LIMIT}&offset=${offset}&api_key=${API_KEY}&format=json`;
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`API error ${res.status} for ${url}`);
      return items;
    }
    const data = await res.json();
    const pageItems = data.bills || [];
    items = items.concat(pageItems);
    if (pageItems.length < LIMIT) break;
    offset += LIMIT;
    await new Promise(r => setTimeout(r, DELAY_MS));
  }
  return items;
}

async function processRep(rep) {
  console.log(`Scraping API for ${rep.name} (${rep.bioguideId})...`);

  try {
    const sponsoredBills = await fetchPaginated(
      `https://api.congress.gov/v3/bill?congress=${CONGRESS}&sponsor=${rep.bioguideId}`
    );

    const cosponsoredBills = await fetchPaginated(
      `https://api.congress.gov/v3/bill?congress=${CONGRESS}&cosponsor=${rep.bioguideId}`
    );

    rep.sponsoredBills = sponsoredBills.length;
    rep.cosponsoredBills = cosponsoredBills.length;
    rep.becameLawBills = 0; // or add enactment check if you had it
    rep.becameLawCosponsoredBills = 0;
    rep.sponsoredAmendments = 0;
    rep.cosponsoredAmendments = 0;
    rep.becameLawAmendments = 0;
    rep.becameLawCosponsoredAmendments = 0;

    console.log(`→ ${rep.name}: ${rep.sponsoredBills} sponsored, ${rep.cosponsoredBills} cosponsored bills`);

  } catch (err) {
    console.error(`Error on ${rep.name}: ${err.message}`);
  }

  return rep;
}

(async () => {
  let processed = 0;
  for (const rep of reps) {
    await processRep(rep);
    processed++;
    if (processed % CHECKPOINT_INTERVAL === 0) {
      fs.writeFileSync('public/representatives-rankings.json', JSON.stringify(reps, null, 2));
      console.log(`Checkpoint: ${processed} reps updated`);
    }
  }
  fs.writeFileSync('public/representatives-rankings.json', JSON.stringify(reps, null, 2));
  console.log('119th Congress rankings updated!');
})();
