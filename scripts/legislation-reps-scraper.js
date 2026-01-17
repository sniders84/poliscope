// scripts/legislation-reps-scraper.js
// Purpose: Update representatives-rankings.json with sponsored/cosponsored bill counts for the 119th Congress
// Handles Congress.gov pagination to avoid zero/partial counts

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const API_KEY = process.env.CONGRESS_API_KEY;
const CONGRESS = 119;
const OUT_PATH = path.join(__dirname, '../public/representatives-rankings.json');

if (!API_KEY) {
  console.error('Missing CONGRESS_API_KEY environment variable.');
  process.exit(1);
}

async function getLegislationCount(baseUrl) {
  let total = 0;
  let next = baseUrl;

  while (next) {
    const res = await axios.get(next, { headers: { 'User-Agent': 'Poliscope/1.0' } });
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
    try {
      const { sponsored, cosponsored } = await getCounts(rep.bioguideId);
      rep.sponsoredBills = sponsored;
      rep.cosponsoredBills = cosponsored;
      console.log(`${rep.name}: sponsored=${sponsored}, cosponsored=${cosponsored}`);
    } catch (err) {
      console.error(`Legislation failed for ${rep.bioguideId} (${rep.name}): ${err.message}`);
    }
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(reps, null, 2));
  console.log('Updated representatives-rankings.json with 119th Congress sponsored/cosponsored counts (paginated)');
})();
