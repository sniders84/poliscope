// scripts/legislation-reps-scraper.js
// Purpose: Update representatives-rankings.json with sponsored/cosponsored counts (119th Congress)
// Uses Congress.gov v3 endpoints with X-Api-Key header, handles pagination via `pagination.next`, with simple retries.

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const OUT_PATH = path.join(__dirname, '../public/representatives-rankings.json');
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

function ensureSchema(rep) {
  rep.sponsoredBills ??= 0;
  rep.cosponsoredBills ??= 0;
  rep.sponsoredAmendments ??= 0;
  rep.cosponsoredAmendments ??= 0;
  rep.becameLawBills ??= 0;
  rep.becameLawCosponsoredBills ??= 0;
  rep.becameLawAmendments ??= 0;
  rep.becameLawCosponsoredAmendments ??= 0;

  rep.yeaVotes ??= 0;
  rep.nayVotes ??= 0;
  rep.missedVotes ??= 0;
  rep.totalVotes ??= 0;
  rep.participationPct ??= 0;
  rep.missedVotePct ??= 0;

  rep.committees = Array.isArray(rep.committees) ? rep.committees : [];
  rep.rawScore ??= 0;
  rep.score ??= 0;
  rep.scoreNormalized ??= 0;

  return rep;
}

(async () => {
  const reps = JSON.parse(fs.readFileSync(OUT_PATH, 'utf-8')).map(ensureSchema);

  for (const rep of reps) {
    const bio = rep.bioguideId;
    if (!bio) continue;

    try {
      const { sponsored, cosponsored } = await getCounts(bio);
      rep.sponsoredBills = sponsored;
      rep.cosponsoredBills = cosponsored;
      console.log(`${rep.name}: sponsored=${sponsored}, cosponsored=${cosponsored}`);
    } catch (err) {
      console.error(`Legislation failed for ${bio} (${rep.name}): ${err.message}`);
    }
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(reps, null, 2));
  console.log('House legislation updated (paginated, header auth)');
})();
