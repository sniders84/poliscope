// Career totals scraper using Congress.gov API
// Resolves bioguideId -> memberId, then fetches sponsored/cosponsored totals

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const OUT_PATH = path.join(__dirname, '../public/senators-rankings.json');
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

// Build a map of bioguideId -> memberId
async function buildMemberMap() {
  let map = {};
  let page = 1;
  while (true) {
    const url = `/member?page=${page}&pageSize=250`;
    const resp = await client.get(url);
    if (resp.status === 429) {
      console.warn(`Rate limited on member list page ${page}, backing off 60s...`);
      await sleep(60000);
      continue;
    }
    const members = resp.data?.members || [];
    if (members.length === 0) break;
    for (const m of members) {
      if (m.bioguideId) {
        map[m.bioguideId] = m.memberId;
      }
    }
    console.log(`Fetched member list page ${page}, total mapped=${Object.keys(map).length}`);
    if (members.length < 250) break;
    page++;
    await sleep(5000);
  }
  return map;
}

// Fetch career totals for one memberId
async function getCareerTotals(memberId) {
  try {
    const sponsoredResp = await client.get(`/member/${memberId}/sponsored-legislation?fields=congress`);
    const cosponsoredResp = await client.get(`/member/${memberId}/cosponsored-legislation?fields=congress`);

    const sponsored = sponsoredResp.data?.pagination?.count || 0;
    const cosponsored = cosponsoredResp.data?.pagination?.count || 0;

    return { sponsored, cosponsored };
  } catch (err) {
    console.error(`Failed to fetch totals for memberId ${memberId}: ${err.message}`);
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

  console.log('Building bioguide -> memberId map...');
  const memberMap = await buildMemberMap();

  for (const sen of sens) {
    const memberId = memberMap[sen.bioguideId];
    if (!memberId) {
      console.warn(`No memberId found for ${sen.name} (${sen.bioguideId})`);
      continue;
    }
    const { sponsored, cosponsored } = await getCareerTotals(memberId);
    sen.sponsoredBills = sponsored;
    sen.cosponsoredBills = cosponsored;
    sen.becameLawBills = 0; // career totals don’t break this out
    sen.becameLawCosponsoredBills = 0;
    console.log(`${sen.name}: sponsored=${sponsored}, cosponsored=${cosponsored}`);
    await sleep(5000); // pause between senators
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(sens, null, 2));
  console.log('Senate legislation updated with career totals (via memberId resolution)');
})();
