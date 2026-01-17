// scripts/legislation-scraper.js
// Purpose: Update senators-rankings.json with sponsored/cosponsored bill counts for the 119th Congress
// Handles Congress.gov pagination and sends proper headers

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const API_KEY = process.env.CONGRESS_API_KEY;
const CONGRESS = 119;
const OUT_PATH = path.join(__dirname, '../public/senators-rankings.json');

if (!API_KEY) {
  console.error('Missing CONGRESS_API_KEY environment variable.');
  process.exit(1);
}

async function getLegislationCount(baseUrl) {
  let total = 0;
  let next = baseUrl;

  while (next) {
    const res = await axios.get(next, {
      headers: {
        'User-Agent': 'Poliscope/1.0',
        'Accept': 'application/json'
      }
    });
    const data = res.data || {};
    total += (data.legislation?.length || 0);
    next = data.pagination?.next || null;
  }
  return total;
}

async function getCounts(bioguideId) {
  const sponsoredURL = `https://api.congress.gov/v3/member/${bioguideId}/sponsored-legislation?congress=${CONGRESS}&api_key=${API_KEY}`;
  const cosponsoredURL = `https://api.congress.gov/v3/member/${bioguideId}/cosponsored-legislation?congress=${CONGRESS}&api_key=${API_KEY}`;

  const [sponsored, cosponsored] = await Promise.all([
    getLegislationCount(sponsoredURL),
    getLegislationCount(cosponsoredURL)
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
    try {
      const { sponsored, cosponsored } = await getCounts(sen.bioguideId);
      sen.sponsoredBills = sponsored;
      sen.cosponsoredBills = cosponsored;
      console.log(`${sen.name}: sponsored=${sponsored}, cosponsored=${cosponsored}`);
    } catch (err) {
      console.error(`Legislation failed for ${sen.bioguideId} (${sen.name}): ${err.message}`);
    }
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(sens, null, 2));
  console.log('Updated senators-rankings.json with 119th Congress sponsored/cosponsored counts (paginated)');
})();
