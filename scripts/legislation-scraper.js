// Career totals scraper using Congress.gov JSON API
// Reads senators JSON, resolves bioguide -> memberId, fetches sponsored/cosponsored counts

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const OUT_PATH = path.join(__dirname, '../public/senators-rankings.json');
const LEGISLATORS_PATH = path.join(__dirname, '../public/legislators-current.json');

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

function ensureSchema(sen) {
  sen.sponsoredBills ??= 0;
  sen.cosponsoredBills ??= 0;
  sen.becameLawBills ??= 0;
  sen.becameLawCosponsoredBills ??= 0;
  return sen;
}

async function getCareerTotals(memberId) {
  try {
    const sponsoredResp = await client.get(`/member/${memberId}/sponsored-legislation`);
    const cosponsoredResp = await client.get(`/member/${memberId}/cosponsored-legislation`);

    const sponsored = sponsoredResp.data?.pagination?.count || 0;
    const cosponsored = cosponsoredResp.data?.pagination?.count || 0;

    return { sponsored, cosponsored };
  } catch (err) {
    console.error(`Failed to fetch totals for memberId ${memberId}: ${err.message}`);
    return { sponsored: 0, cosponsored: 0 };
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
  const sens = JSON.parse(fs.readFileSync(OUT_PATH, 'utf-8')).map(ensureSchema);
  const legislators = JSON.parse(fs.readFileSync(LEGISLATORS_PATH, 'utf-8'));

  // Build bioguide -> memberId map
  const memberMap = {};
  for (const leg of legislators) {
    if (leg.id?.bioguide && leg.id?.congressgov_id) {
      memberMap[leg.id.bioguide] = leg.id.congressgov_id;
    }
  }

  for (const sen of sens) {
    const memberId = memberMap[sen.bioguideId];
    if (!memberId) {
      console.warn(`No memberId found for ${sen.name} (${sen.bioguideId})`);
      continue;
    }
    const { sponsored, cosponsored } = await getCareerTotals(memberId);
    sen.sponsoredBills = sponsored;
    sen.cosponsoredBills = cosponsored;
    sen.becameLawBills = 0;
    sen.becameLawCosponsoredBills = 0;
    console.log(`${sen.name}: sponsored=${sponsored}, cosponsored=${cosponsored}`);
    await sleep(5000);
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(sens, null, 2));
  console.log('Senate legislation updated with career totals (via Congress.gov JSON API)');
})();
