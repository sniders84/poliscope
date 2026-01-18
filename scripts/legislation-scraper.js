// Senate legislation scraper using Congress.gov API
// Iterates through each senator sequentially, throttled to avoid 429 errors

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const OUT_PATH = path.join(__dirname, '../public/senators-rankings.json');
const API_KEY = process.env.CONGRESS_API_KEY;
const CONGRESS = 119;
const PAGE_SIZE = 250;

if (!API_KEY) {
  console.error('Missing CONGRESS_API_KEY');
  process.exit(1);
}

const client = axios.create({
  baseURL: 'https://api.congress.gov/v3',
  timeout: 20000,
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

async function getWithRetry(url, attempts = 3, delay = 2000) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      const resp = await client.get(url);
      if (resp.status === 429) {
        console.warn(`Rate limited on ${url}, sleeping ${delay}ms...`);
        await sleep(delay);
        delay *= 2; // exponential backoff
        continue;
      }
      if (resp.status >= 400) throw new Error(`HTTP ${resp.status}`);
      return resp;
    } catch (err) {
      lastErr = err;
      await sleep(delay);
      delay *= 2;
    }
  }
  throw lastErr;
}

async function getCount(url) {
  const resp = await getWithRetry(url);
  return resp.data?.pagination?.count || 0;
}

async function getBecameLawCount(baseUrl) {
  const firstUrl = `${baseUrl}&pageSize=${PAGE_SIZE}&fields=lawNumber,latestAction,congress`;
  const first = await getWithRetry(firstUrl);
  const total = first.data?.pagination?.count || 0;
  if (total === 0) return 0;

  let count = countLawItems(first.data.bills || []);
  const pages = Math.ceil(total / PAGE_SIZE);

  for (let p = 2; p <= pages; p++) {
    const url = `${baseUrl}&page=${p}&pageSize=${PAGE_SIZE}&fields=lawNumber,latestAction,congress`;
    const resp = await getWithRetry(url).catch(() => null);
    if (resp) count += countLawItems(resp.data.bills || []);
    await sleep(500); // small pause between pages
  }

  return count;
}

function countLawItems(items) {
  return items.filter(i => i.congress === CONGRESS &&
    (i.lawNumber || (i.latestAction?.text || '').toLowerCase().includes('public law'))
  ).length;
}

async function getCounts(bioguideId) {
  const sponsoredURL = `/bill?congress=${CONGRESS}&sponsorId=${bioguideId}`;
  const cosponsoredURL = `/bill?congress=${CONGRESS}&cosponsorId=${bioguideId}`;

  const sponsored = await getCount(sponsoredURL);
  await sleep(1000);
  const cosponsored = await getCount(cosponsoredURL);

  const becameLawSponsored = await getBecameLawCount(sponsoredURL);
  await sleep(1000);
  const becameLawCosponsored = await getBecameLawCount(cosponsoredURL);

  return { sponsored, cosponsored, becameLawSponsored, becameLawCosponsored };
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

  for (const sen of sens) {
    try {
      const { sponsored, cosponsored, becameLawSponsored, becameLawCosponsored } =
        await getCounts(sen.bioguideId);
      sen.sponsoredBills = sponsored;
      sen.cosponsoredBills = cosponsored;
      sen.becameLawBills = becameLawSponsored;
      sen.becameLawCosponsoredBills = becameLawCosponsored;
      console.log(`${sen.name}: sponsored=${sponsored}, cosponsored=${cosponsored}, becameLawSponsored=${becameLawSponsored}, becameLawCosponsored=${becameLawCosponsored}`);
    } catch (err) {
      console.error(`Legislation failed for ${sen.bioguideId} (${sen.name}): ${err.message}`);
    }
    await sleep(2000); // pause between senators to avoid 429
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(sens, null, 2));
  console.log('Senate legislation updated with 119th-only counts + accurate became-law detection');
})();
