

// Update senators-rankings.json with sponsored/cosponsored counts for the 119th Congress
// Includes retry handling and became-law detection for bills

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

async function fetchPaginated(url, key) {
  let next = url;
  let items = [];
  while (next) {
    let resp;
    let attempts = 0;
    while (attempts < 2) {
      try {
        resp = await client.get(next);
        if (resp.status === 502 || resp.status === 503) {
          attempts++;
          console.warn(`Retrying ${url} due to ${resp.status}...`);
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }
        break;
      } catch (err) {
        attempts++;
        console.warn(`Error fetching ${url}, retrying...`);
        await new Promise(r => setTimeout(r, 1000));
      }
    }
    if (!resp || resp.status >= 400) throw new Error(`HTTP ${resp?.status || 'unknown'}`);

    const data = resp.data || {};
    const batch = (data[key] || []).filter(i => i.congress === CONGRESS);
    items = items.concat(batch);
    next = data.pagination?.next || null;
  }
  return items;
}

async function getCounts(bioguideId) {
  const sponsoredURL = `/member/${bioguideId}/sponsored-legislation?congress=${CONGRESS}`;
  const cosponsoredURL = `/member/${bioguideId}/cosponsored-legislation?congress=${CONGRESS}`;

  const [sponsoredItems, cosponsoredItems] = await Promise.all([
    fetchPaginated(sponsoredURL, 'sponsoredLegislation'),
    fetchPaginated(cosponsoredURL, 'cosponsoredLegislation')
  ]);

  const sponsored = sponsoredItems.length;
  const cosponsored = cosponsoredItems.length;

  const becameLawSponsored = sponsoredItems.filter(
    i => i.lawNumber || (i.latestAction?.text || '').includes('Public Law')
  ).length;

  const becameLawCosponsored = cosponsoredItems.filter(
    i => i.lawNumber || (i.latestAction?.text || '').includes('Public Law')
  ).length;

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
  for (const sen of sens) {
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
  }
  fs.writeFileSync(OUT_PATH, JSON.stringify(sens, null, 2));
  console.log('Senate legislation updated with 119th Congress counts + became-law detection');
})();
