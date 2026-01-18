// Fast + complete Senate legislation scraper
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

// Get count from pagination
async function getCount(url) {
  const resp = await client.get(url);
  if (resp.status >= 400) throw new Error(`HTTP ${resp.status}`);
  return resp.data.pagination?.count || 0;
}

// Get became-law count by filtering for lawNumber
async function getLawCount(url) {
  const resp = await client.get(url + '&lawNumber=*');
  if (resp.status >= 400) throw new Error(`HTTP ${resp.status}`);
  return resp.data.pagination?.count || 0;
}

async function getCounts(bioguideId) {
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

  // Run senators in parallel batches to speed up
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
  console.log('Senate legislation updated with complete counts + became-law detection');
})();
