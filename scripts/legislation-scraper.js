const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const RANKINGS_PATH = path.join(__dirname, '../public/senators-rankings.json');
const API_KEY = process.env.CONGRESS_API_KEY;
const CONGRESS = process.env.CONGRESS_NUMBER || '119';

const BILL_TYPES = ['s', 'sjres', 'sconres', 'sres']; // Senate bills/resolutions
const AMENDMENT_TYPES = ['samdt']; // Senate amendments

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchPaginated(urlBase) {
  let results = [];
  let offset = 0;
  const pageSize = 250;

  while (true) {
    const url = `${urlBase}&pageSize=${pageSize}&offset=${offset}`;
    console.log(`Fetching ${url}`);
    const res = await fetch(url, { headers: { 'X-API-Key': API_KEY } });
    if (!res.ok) {
      console.error(`Failed ${url}: ${res.status} - ${await res.text()}`);
      break;
    }
    const data = await res.json();
    const chunk = data.bills || data.amendments || [];
    if (chunk.length === 0) break;
    results = results.concat(chunk);
    offset += pageSize;
    await delay(1000); // 1s delay to avoid rate limits
  }

  return results;
}

async function updateRankings() {
  let rankings;
  try {
    rankings = JSON.parse(fs.readFileSync(RANKINGS_PATH, 'utf8'));
  } catch (err) {
    console.error('Failed to load rankings.json:', err.message);
    return;
  }

  // Map bioguideId -> senator index
  const idToIndex = new Map(rankings.map((sen, idx) => [sen.bioguideId, idx]));

  console.log(`Processing ${BILL_TYPES.length} bill types + amendments...`);

  // Bills/Resolutions
  for (const type of BILL_TYPES) {
    const bills = await fetchPaginated(`https://api.congress.gov/v3/bill/${CONGRESS}/${type}?format=json`);
    for (const bill of bills) {
      // Sponsor
      const sponsorId = bill.sponsor?.bioguideId || (bill.sponsors?.[0]?.bioguideId);
      if (sponsorId && idToIndex.has(sponsorId)) {
        const idx = idToIndex.get(sponsorId);
        rankings[idx].sponsoredLegislation = (rankings[idx].sponsoredLegislation || 0) + 1;
        if (bill.latestAction?.text?.includes('Became Public Law')) {
          rankings[idx].becameLawLegislation = (rankings[idx].becameLawLegislation || 0) + 1;
        }
      }

      // Cosponsors
      const cosponsors = bill.cosponsors || bill.cosponsors?.items || [];
      for (const cos of cosponsors) {
        const cosId = cos.bioguideId;
        if (cosId && idToIndex.has(cosId)) {
          const idx = idToIndex.get(cosId);
          rankings[idx].cosponsoredLegislation = (rankings[idx].cosponsoredLegislation || 0) + 1;
          if (bill.latestAction?.text?.includes('Became Public Law')) {
            rankings[idx].becameLawCosponsoredAmendments = (rankings[idx].becameLawCosponsoredAmendments || 0) + 1;
          }
        }
      }
    }
  }

  // Amendments
  const amendments = await fetchPaginated(`https://api.congress.gov/v3/amendment/${CONGRESS}?format=json`);
  for (const amd of amendments) {
    const sponsorId = amd.sponsor?.bioguideId || (amd.sponsors?.[0]?.bioguideId);
    if (sponsorId && idToIndex.has(sponsorId)) {
      const idx = idToIndex.get(sponsorId);
      rankings[idx].sponsoredAmendments = (rankings[idx].sponsoredAmendments || 0) + 1;
      if (amd.latestAction?.text?.includes('Became Public Law')) {
        rankings[idx].becameLawAmendments = (rankings[idx].becameLawAmendments || 0) + 1;
      }
    }

    // Cosponsors for amendments (less common, but check)
    const cosponsors = amd.cosponsors || [];
    for (const cos of cosponsors) {
      const cosId = cos.bioguideId;
      if (cosId && idToIndex.has(cosId)) {
        const idx = idToIndex.get(cosId);
        rankings[idx].cosponsoredAmendments = (rankings[idx].cosponsoredAmendments || 0) + 1;
      }
    }
  }

  // Save back to rankings.json
  try {
    fs.writeFileSync(RANKINGS_PATH, JSON.stringify(rankings, null, 2));
    console.log(`Updated senators-rankings.json with legislation data for ${rankings.length} senators`);
  } catch (err) {
    console.error('Failed to write rankings.json:', err.message);
  }
}

updateRankings().catch(err => {
  console.error('Script failed:', err.message);
  process.exit(1);
});
