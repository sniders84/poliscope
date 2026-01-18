// scripts/legislation-scraper.js
// Fast + complete Senate legislation scraper for the 119th Congress
// Uses pagination.count for totals and filtered queries for became-law counts

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const OUT_PATH = path.join(__dirname, '../public/senators-rankings.json');
const API_KEY = process.env.CONGRESS_API_KEY;
const CONGRESS = 119;

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

// Basic GET with retry for transient 502/503
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

// Get count from pagination (exact total)
async function getCount(url) {
  const resp = await getWithRetry(url);
  return resp.data?.pagination?.count || 0;
}

// Get became-law count by filtering for lawNumber (exact total)
async function getLawCount(url) {
  // Ensure we keep the congress filter and add lawNumber filter
  const lawUrl = url.includes('?') ? `${url}&lawNumber=*` : `${url}?lawNumber=*`;
  const resp = await getWithRetry(lawUrl);
  return resp.data?.pagination?.count || 0;
}

async function getCounts(bioguideId) {
  // Strictly filter to the 119th Congress on every base URL
  const sponsoredURL = `/member/${bioguideId}/sponsored-legislation?congress=${CONGRESS}`;
  const cosponsoredURL = `/member/${bioguideId}/cosponsored-legislation?congress=${CONGRESS}`;

  const [sponsored, cosponsored, becameLawSponsored, becameLawCosponsored] = await Promise.all([
    getCount(sponsoredURL),
    getCount(cosponsoredURL),
    getLawCount(sponsoredURL),
    getLawCount(cosponsoredURL)
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

  // Concurrency to finish in minutes
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
  console.log('Senate legislation updated with complete 119th counts + became-law detection');
})();
