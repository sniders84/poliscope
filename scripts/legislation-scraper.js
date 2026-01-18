// Career totals scraper using LIS IDs from legislators-current.json
// Reads local roster, maps bioguide -> LIS, then queries Congress.gov

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const OUT_PATH = path.join(__dirname, '../public/senators-rankings.json');
const ROSTER_PATH = path.join(__dirname, '../public/legislators-current.json');
const API_KEY = process.env.CONGRESS_API_KEY;

if (!API_KEY) {
  console.error('Missing CONGRESS_API_KEY');
  process.exit(1);
}

const client = axios.create({
  baseURL: 'https://api.congress.gov/v3',
  timeout: 30000,
  headers: {
    'X-Api-Key': API_KEY,
    'User-Agent': 'poliscope/1.0',
    'Accept': 'application/json'
  },
  validateStatus: s => s >= 200 && s < 500
});

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Build bioguide -> LIS map from local roster
function buildLisMap() {
  const roster = JSON.parse(fs.readFileSync(ROSTER_PATH, 'utf-8'));
  const map = {};
  for (const leg of roster) {
    if (leg.id?.bioguide && leg.id?.lis) {
      map[leg.id.bioguide] = leg.id.lis;
    }
  }
  return map;
}

// Fetch career totals for one LIS ID
async function getCareerTotals(lisId) {
  try {
    const sponsoredResp = await client.get(`/member/${lisId}/sponsored-legislation`);
    const cosponsoredResp = await client.get(`/member/${lisId}/cosponsored-legislation`);

    const sponsored = sponsoredResp.data?.pagination?.count || 0;
    const cosponsored = cosponsoredResp.data?.pagination?.count || 0;

    return { sponsored, cosponsored };
  } catch (err) {
    console.error(`Failed to fetch totals for LIS ${lisId}: ${err.message}`);
    return { sponsored: 0, cosponsored: 0 };
  }
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

  console.log('Building bioguide -> LIS map from legislators-current.json...');
  const lisMap = buildLisMap();

  for (const sen of sens) {
    const lisId = lisMap[sen.bioguideId];
    if (!lisId) {
      console.warn(`No LIS ID found for ${sen.name} (${sen.bioguideId})`);
      continue;
    }
    const { sponsored, cosponsored } = await getCareerTotals(lisId);
    sen.sponsoredBills = sponsored;
    sen.cosponsoredBills = cosponsored;
    sen.becameLawBills = 0; // career totals don’t break this out
    sen.becameLawCosponsoredBills = 0;
    console.log(`${sen.name}: sponsored=${sponsored}, cosponsored=${cosponsored}`);
    await sleep(5000); // pause between senators
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(sens, null, 2));
  console.log('Senate legislation updated with career totals (via LIS IDs)');
})();
