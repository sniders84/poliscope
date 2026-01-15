// scripts/legislation-reps-scraper.js
// Purpose: Populate sponsored/cosponsored bills + amendments for all House members into representatives-rankings.json

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const OUT_PATH = path.join(__dirname, '..', 'public', 'representatives-rankings.json');

// Congress.gov endpoints (House)
const BILL_TYPES = [
  { type: 'hr', label: 'House Bills' },
  { type: 'hjres', label: 'House Joint Resolutions' },
  { type: 'hconres', label: 'House Concurrent Resolutions' },
  { type: 'hres', label: 'House Resolutions' },
];
const AMENDMENTS_ENDPOINT = `https://api.congress.gov/v3/amendment/119?format=json&pageSize=250`;

const API_KEY = process.env.CONGRESS_API_KEY || '';

async function fetchPaged(urlBase) {
  const results = [];
  let offset = 0;
  while (true) {
    const url = `${urlBase}&offset=${offset}`;
    const res = await fetch(url, { headers: { 'X-Api-Key': API_KEY } });
    if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
    const data = await res.json();
    const items = data?.bills || data?.amendments || [];
    if (!items.length) break;
    results.push(...items);
    offset += 250;
    // Safety cap
    if (offset > 8000) break;
  }
  return results;
}

function ensureRepShape(rep) {
  return {
    name: rep.name,
    bioguideId: rep.bioguideId,
    state: rep.state,
    party: rep.party,
    office: rep.office || 'Representative',
    sponsoredBills: rep.sponsoredBills || 0,
    cosponsoredBills: rep.cosponsoredBills || 0,
    sponsoredAmendments: rep.sponsoredAmendments || 0,
    cosponsoredAmendments: rep.cosponsoredAmendments || 0,
    yeaVotes: rep.yeaVotes || 0,
    nayVotes: rep.nayVotes || 0,
    missedVotes: rep.missedVotes || 0,
    totalVotes: rep.totalVotes || 0,
    committees: Array.isArray(rep.committees) ? rep.committees : [],
    participationPct: rep.participationPct || 0,
    missedVotePct: rep.missedVotePct || 0,
    rawScore: rep.rawScore || 0,
    scoreNormalized: rep.scoreNormalized || 0,
  };
}

function indexByBioguide(list) {
  const map = new Map();
  list.forEach(r => {
    if (r.bioguideId) map.set(r.bioguideId, r);
  });
  return map;
}

function countSponsorship(repMap, item, isAmendment = false) {
  // Congress.gov bill/amendment sponsor/cosponsors structure varies—handle both
  const sponsorBio = item?.sponsor?.bioguideId || item?.sponsors?.[0]?.bioguideId || null;
  const cosponsors = item?.cosponsors || item?.cosponsorsBy || item?.cosponsorsByParty || [];
  const cosBioIds = Array.isArray(cosponsors)
    ? cosponsors.map(c => c?.bioguideId).filter(Boolean)
    : [];

  if (sponsorBio && repMap.has(sponsorBio)) {
    const rep = repMap.get(sponsorBio);
    if (isAmendment) rep.sponsoredAmendments += 1;
    else rep.sponsoredBills += 1;
  }

  cosBioIds.forEach(bio => {
    if (repMap.has(bio)) {
      const rep = repMap.get(bio);
      if (isAmendment) rep.cosponsoredAmendments += 1;
      else rep.cosponsoredBills += 1;
    }
  });
}

(async function main() {
  const reps = JSON.parse(fs.readFileSync(OUT_PATH, 'utf-8'));
  const repMap = indexByBioguide(reps.map(ensureRepShape));

  console.log('Processing 4 bill types + amendments...');

  // Bills
  for (const bt of BILL_TYPES) {
    const base = `https://api.congress.gov/v3/bill/119/${bt.type}?format=json&pageSize=250`;
    const bills = await fetchPaged(base);
    bills.forEach(b => countSponsorship(repMap, b, false));
  }

  // Amendments
  const amendments = await fetchPaged(AMENDMENTS_ENDPOINT);
  amendments.forEach(a => countSponsorship(repMap, a, true));

  // Write back
  const updated = reps.map(r => ensureRepShape(repMap.get(r.bioguideId) || r));
  fs.writeFileSync(OUT_PATH, JSON.stringify(updated, null, 2));
  console.log(`Updated representatives-rankings.json with legislation data for ${updated.length} representatives`);
})().catch(err => {
  console.error('Legislation scraper failed:', err);
  process.exit(1);
});
