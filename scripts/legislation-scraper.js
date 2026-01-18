// Senate legislation scraper using Congress.gov API
// Iterates through each senator, queries sponsored/cosponsored bills, counts totals and became-law bills

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

async function getWithRetry(url, attempts = 2) {
  let lastErr;
  for (let i = 0; i <= attempts; i++) {
    try {
      const resp = await client.get(url);
      if (resp.status >= 400) throw new Error(`HTTP ${resp.status}`);
      return resp;
    } catch (err) {
      lastErr = err;
      await new Promise(r => setTimeout(r, 800));
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

  const urls = [];
  for (let p = 2; p <= pages; p++) {
    urls.push(`${baseUrl}&page=${p}&pageSize=${PAGE_SIZE}&fields=lawNumber,latestAction,congress`);
  }

  const concurrency = 10;
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    const resps = await Promise.all(batch.map(u => getWithRetry(u).catch(() => null)));
    for (const r of resps) {
      if (r) count += countLawItems(r.data.bills || []);
    }
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

  const [sponsored, cosponsored] = await Promise.all([
    getCount(sponsoredURL),
    getCount(cosponsoredURL)
  ]);

  const [becameLawSponsored, becameLawCosponsored] = await Promise.all([
    getBecameLawCount(sponsoredURL),
    getBecameLawCount(cosponsoredURL)
  ]);

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
  const concurrency = 5; // keep concurrency modest to avoid API throttling

  for (let i = 0; i < sens.length; i += concurrency) {
    const batch = sens.slice(i, i + concurrency);
    await Promise.all(batch.map(async sen => {
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
    }));
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(sens, null, 2));
  console.log('Senate legislation updated with 119th-only counts + accurate became-law detection');
})();
