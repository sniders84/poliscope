// scripts/legislation-scraper.js
// Purpose: Update senators-rankings.json with sponsored/cosponsored counts (119th Congress)
// Uses Congress.gov v3 endpoints with X-Api-Key header, handles pagination via `pagination.next`, with simple retries.

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

async function fetchPaginated(url) {
  let next = url;
  let total = 0;
  let attempts = 0;

  while (next) {
    const resp = await client.get(next);
    if (resp.status === 403) {
      // brief backoff and retry a couple times
      if (++attempts <= 2) {
        await new Promise(r => setTimeout(r, 500));
        continue;
      }
      throw new Error('403');
    }
    if (resp.status >= 400) throw new Error(`HTTP ${resp.status}`);

    const data = resp.data || {};
    total += (data.legislation?.length || 0);
    next = data.pagination?.next || null;
  }
  return total;
}

async function getCounts(bioguideId) {
  const sponsoredURL = `/member/${bioguideId}/sponsored-legislation?congress=${CONGRESS}`;
  const cosponsoredURL = `/member/${bioguideId}/cosponsored-legislation?congress=${CONGRESS}`;

  const [sponsored, cosponsored] = await Promise.all([
    fetchPaginated(sponsoredURL),
    fetchPaginated(cosponsoredURL)
  ]);

  return { sponsored, cosponsored };
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

  for (const sen of sens) {
    const bio = sen.bioguideId;
    if (!bio) continue;

    try {
      const { sponsored, cosponsored } = await getCounts(bio);
      sen.sponsoredBills = sponsored;
      sen.cosponsoredBills = cosponsored;
      console.log(`${sen.name}: sponsored=${sponsored}, cosponsored=${cosponsored}`);
    } catch (err) {
      console.error(`Legislation failed for ${bio} (${sen.name}): ${err.message}`);
      // Keep zeros to preserve schema
    }
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(sens, null, 2));
  console.log('Senate legislation updated (paginated, header auth)');
})();
