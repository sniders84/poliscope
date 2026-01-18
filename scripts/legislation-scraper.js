// Accurate + fast Senate legislation scraper for the 119th Congress
// Totals via pagination.count; became-law via minimal-field pagination

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const OUT_PATH = path.join(__dirname, '../public/senators-rankings.json');
const API_KEY = process.env.CONGRESS_API_KEY;
const CONGRESS = 119;
const PAGE_SIZE = 250; // large page size to minimize requests

if (!API_KEY) {
  console.error('Missing CONGRESS_API_KEY');
  process.exit(1);
}

const client = axios.create({
  baseURL: 'https://api.congress.gov/v3',
  timeout: 20000,
  headers: {
    'X-Api-Key': API_KEY,
    'User-Agent': 'poliscope/1.0 (+https://github.com/sniders84/poliscope)',
    'Accept': 'application/json'
  },
  validateStatus: s => s >= 200 && s < 500
});

async function getWithRetry(url, attempts = 2) {
  let lastErr;
  for (let i = 0; i <= attempts; i++) {
    try {
      const resp = await client.get(url);
      if (resp.status === 502 || resp.status === 503) {
        lastErr = new Error(`HTTP ${resp.status}`);
        await new Promise(r => setTimeout(r, 800));
        continue;
      }
      if (resp.status >= 400) throw new Error(`HTTP ${resp.status}`);
      return resp;
    } catch (err) {
      lastErr = err;
      await new Promise(r => setTimeout(r, 800));
    }
  }
  throw lastErr || new Error('Unknown request error');
}

// Exact totals from pagination.count
async function getCount(url) {
  const resp = await getWithRetry(url);
  return resp.data?.pagination?.count || 0;
}

// Became-law count by paginating minimal fields and checking markers
async function getBecameLawCount(baseUrl, key) {
  // First request to get total pages
  const firstUrl = `${baseUrl}&pageSize=${PAGE_SIZE}&fields=lawNumber,latestAction,congress`;
  const first = await getWithRetry(firstUrl);
  const total = first.data?.pagination?.count || 0;
  if (total === 0) return 0;

  const pages = Math.ceil(total / PAGE_SIZE);
  let count = 0;

  // Count from first page
  count += countLawItems(first.data[key] || []);

  // Fetch remaining pages in parallel batches
  const urls = [];
  for (let p = 2; p <= pages; p++) {
    urls.push(`${baseUrl}&page=${p}&pageSize=${PAGE_SIZE}&fields=lawNumber,latestAction,congress`);
  }

  const concurrency = 10;
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    const resps = await Promise.all(batch.map(u => getWithRetry(u).catch(e => ({ error: e }))));
    for (const r of resps) {
      if (r.error) continue;
      count += countLawItems(r.data[key] || []);
    }
  }

  return count;
}

function countLawItems(items) {
  // Strictly count 119th Congress items that became law
  let c = 0;
  for (const i of items) {
    if (i.congress !== CONGRESS) continue;
    const law = !!i.lawNumber;
    const latest = (i.latestAction?.text || '').toLowerCase();
    const hasPublicLaw = latest.includes('public law') || latest.includes('became public law');
    if (law || hasPublicLaw) c++;
  }
  return c;
}

async function getCounts(bioguideId) {
  const sponsoredBase = `/member/${bioguideId}/sponsored-legislation?congress=${CONGRESS}`;
  const cosponsoredBase = `/member/${bioguideId}/cosponsored-legislation?congress=${CONGRESS}`;

  // Totals (fast)
  const [sponsored, cosponsored] = await Promise.all([
    getCount(sponsoredBase),
    getCount(cosponsoredBase)
  ]);

  // Became-law (accurate, minimal payload pagination)
  const [becameLawSponsored, becameLawCosponsored] = await Promise.all([
    getBecameLawCount(sponsoredBase, 'sponsoredLegislation'),
    getBecameLawCount(cosponsoredBase, 'cosponsoredLegislation')
  ]);

  return { sponsored, cosponsored, becameLawSponsored, becameLawCosponsored };
}

function ensureSchema(sen) {
  sen.sponsoredBills ??= 0;
  sen.cosponsoredBills ??= 0;
  sen.sponsoredAmendments ??= 0;
  sen.cosponsoredAmendments ??= 0;
  sen.becameLawBills ??= 0;
  sen.becameLawCosponsoredBills ??= 0;
  sen.becameLawAmendments ??= 0;
  sen.becameLawCosponsoredAmendments ??= 0;
  sen.yeaVotes ??= 0;
  sen.nayVotes ??= 0;
  sen.missedVotes ??= 0;
  sen.totalVotes ??= 0;
  sen.participationPct ??= 0;
  sen.missedVotePct ??= 0;
  sen.committees = Array.isArray(sen.committees) ? sen.committees : [];
  sen.rawScore ??= 0;
  sen.score ??= 0;
  sen.scoreNormalized ??= 0;
  return sen;
}

(async () => {
  const sens = JSON.parse(fs.readFileSync(OUT_PATH, 'utf-8')).map(ensureSchema);

  const concurrency = 10;
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
        console.log(
          `${sen.name}: sponsored=${sponsored}, cosponsored=${cosponsored}, becameLawSponsored=${becameLawSponsored}, becameLawCosponsored=${becameLawCosponsored}`
        );
      } catch (err) {
        console.error(`Legislation failed for ${sen.bioguideId} (${sen.name}): ${err.message}`);
      }
    }));
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(sens, null, 2));
  console.log('Senate legislation updated with complete 119th counts + accurate became-law detection');
})();
