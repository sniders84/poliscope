// scripts/legislation-reps-scraper.js
// This is a complete replacement for your original legislation-reps-scraper.js
// It exclusively processes data for the 119th Congress (all sessions),
// separates sponsored vs. cosponsored bills and amendments,
// counts total and "became law" variants,
// adds checkpoints every 20 reps with intermediate saves,
// includes delays to avoid rate limits,
// and robust error handling per rep.

const fs = require('fs');
const path = require('path');

// Load base reps data from public/representatives-rankings.json
// (assumed to be bootstrapped with members, committees, etc.)
let reps = [];
try {
  reps = JSON.parse(fs.readFileSync('public/representatives-rankings.json', 'utf8'));
} catch (err) {
  console.error('Error loading base rankings JSON:', err.message);
  process.exit(1);
}

const API_KEY = process.env.CONGRESS_API_KEY;
if (!API_KEY) {
  console.error('CONGRESS_API_KEY environment variable is required.');
  process.exit(1);
}

const CONGRESS = 119;
const LIMIT = 250; // Max per page from API
const DELAY_MS = 600; // ~100 req/min to avoid rate limits
const CHECKPOINT_INTERVAL = 20;

// Helper to fetch paginated data from Congress.gov API
async function fetchPaginated(urlBase) {
  let items = [];
  let offset = 0;
  while (true) {
    const url = `${urlBase}&limit=${LIMIT}&offset=${offset}&api_key=${API_KEY}&format=json`;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.error(`API error: ${res.status} for ${url}`);
        return items; // Return partial if error
      }
      const data = await res.json();
      const pageItems = data.bills || data.amendments || [];
      items = items.concat(pageItems);
      if (pageItems.length < LIMIT) break;
      offset += LIMIT;
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    } catch (err) {
      console.error(`Fetch error for ${url}: ${err.message}`);
      break;
    }
  }
  return items;
}

// Function to process a single rep
async function processRep(rep) {
  console.log(`Scraping API for ${rep.name} (${rep.bioguideId})...`);

  try {
    // Sponsored bills
    const sponsoredBills = await fetchPaginated(
      `https://api.congress.gov/v3/bill?congress=${CONGRESS}&sponsor=${rep.bioguideId}`
    );

    // Cosponsored bills
    const cosponsoredBills = await fetchPaginated(
      `https://api.congress.gov/v3/bill?congress=${CONGRESS}&cosponsor=${rep.bioguideId}`
    );

    // Sponsored amendments
    const sponsoredAmendments = await fetchPaginated(
      `https://api.congress.gov/v3/amendment?congress=${CONGRESS}&sponsor=${rep.bioguideId}`
    );

    // Cosponsored amendments
    const cosponsoredAmendments = await fetchPaginated(
      `https://api.congress.gov/v3/amendment?congress=${CONGRESS}&cosponsor=${rep.bioguideId}`
    );

    // Counts
    const sponsoredCount = sponsoredBills.length;
    const cosponsoredCount = cosponsoredBills.length;
    const sponsoredAmdCount = sponsoredAmendments.length;
    const cosponsoredAmdCount = cosponsoredAmendments.length;

    let becameLawSponsored = 0;
    let becameLawCosponsored = 0;
    let becameLawAmdSponsored = 0;
    let becameLawAmdCosponsored = 0;

    // Robust "became law" detection for bills
    const isEnacted = (item) => {
      if (!item || !item.latestAction) return false;
      const text = (item.latestAction.text || '').toLowerCase();
      if (
        text.includes('became public law') ||
        text.includes('signed by president') ||
        text.includes('enacted')
      ) {
        return true;
      }
      // Fallback: check actions array if present
      if (item.actions && Array.isArray(item.actions)) {
        return item.actions.some(a => {
          const aText = (a.text || '').toLowerCase();
          return (
            (a.actionCode && a.actionCode === 'E') || // Common enactment code
            aText.includes('enacted') ||
            aText.includes('public law') ||
            aText.includes('signed by president')
          );
        });
      }
      return false;
    };

    // Count enacted bills
    for (const bill of sponsoredBills) {
      if (isEnacted(bill)) becameLawSponsored++;
    }
    for (const bill of cosponsoredBills) {
      if (isEnacted(bill)) becameLawCosponsored++;
    }

    // For amendments: Use similar logic, but amendments often "agreed to" rather than "enacted"
    // Adjust if needed based on amendment action texts (e.g., "Agreed to in House/Senate")
    const isAmendmentSuccessful = (amd) => {
      if (!amd || !amd.latestAction) return false;
      const text = (amd.latestAction.text || '').toLowerCase();
      return (
        text.includes('agreed to') ||
        text.includes('adopted') ||
        text.includes('passed') ||
        text.includes('incorporated') // Or other success indicators
      );
    };

    for (const amd of sponsoredAmendments) {
      if (isAmendmentSuccessful(amd)) becameLawAmdSponsored++;
    }
    for (const amd of cosponsoredAmendments) {
      if (isAmendmentSuccessful(amd)) becameLawAmdCosponsored++;
    }

    // Update rep object
    rep.sponsoredBills = sponsoredCount;
    rep.cosponsoredBills = cosponsoredCount;
    rep.becameLawBills = becameLawSponsored;
    rep.becameLawCosponsoredBills = becameLawCosponsored;
    rep.sponsoredAmendments = sponsoredAmdCount;
    rep.cosponsoredAmendments = cosponsoredAmdCount;
    rep.becameLawAmendments = becameLawAmdSponsored;
    rep.becameLawCosponsoredAmendments = becameLawAmdCosponsored;

    // Log summary like your original
    console.log(
      `→ ${rep.name}: ${sponsoredCount} sponsored, ${cosponsoredCount} cosponsored bills`
    );

  } catch (err) {
    console.error(`Error processing ${rep.name}: ${err.message}`);
    // Continue with defaults (0s) if error
  }

  return rep;
}

// Main execution
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
  // Final save
  fs.writeFileSync('public/representatives-rankings.json', JSON.stringify(reps, null, 2));
  console.log('119th Congress rankings updated!');
})();
