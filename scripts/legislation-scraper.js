// Senate legislation scraper using /bill?congress=119 endpoint
// Fetches all bills once, then filters by sponsor/cosponsor bioguideId

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

async function fetchAllBills() {
  const firstUrl = `/bill?congress=${CONGRESS}&pageSize=${PAGE_SIZE}`;
  const first = await client.get(firstUrl);
  const total = first.data?.pagination?.count || 0;
  if (total === 0) {
    console.warn('No bills returned for Congress', CONGRESS);
    return [];
  }

  let bills = first.data.bills || [];
  const pages = Math.ceil(total / PAGE_SIZE);

  for (let p = 2; p <= pages; p++) {
    const url = `/bill?congress=${CONGRESS}&page=${p}&pageSize=${PAGE_SIZE}`;
    const resp = await client.get(url);
    bills = bills.concat(resp.data.bills || []);
  }

  return bills;
}

function countForSenator(bills, bioguideId) {
  const sponsored = bills.filter(b => b.sponsor?.bioguideId === bioguideId);
  const cosponsored = bills.filter(b => (b.cosponsors || []).some(c => c.bioguideId === bioguideId));

  const becameLawSponsored = sponsored.filter(b => b.lawNumber || (b.latestAction?.text || '').includes('Public Law')).length;
  const becameLawCosponsored = cosponsored.filter(b => b.lawNumber || (b.latestAction?.text || '').includes('Public Law')).length;

  return {
    sponsored: sponsored.length,
    cosponsored: cosponsored.length,
    becameLawSponsored,
    becameLawCosponsored
  };
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

  console.log('Fetching all bills for 119th Congress...');
  const bills = await fetchAllBills();
  console.log(`Fetched ${bills.length} bills`);

  for (const sen of sens) {
    const { sponsored, cosponsored, becameLawSponsored, becameLawCosponsored } =
      countForSenator(bills, sen.bioguideId);
    sen.sponsoredBills = sponsored;
    sen.cosponsoredBills = cosponsored;
    sen.becameLawBills = becameLawSponsored;
    sen.becameLawCosponsoredBills = becameLawCosponsored;
    console.log(`${sen.name}: sponsored=${sponsored}, cosponsored=${cosponsored}, becameLawSponsored=${becameLawSponsored}, becameLawCosponsored=${becameLawCosponsored}`);
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(sens, null, 2));
  console.log('Senate legislation updated with 119th-only counts + accurate became-law detection');
})();
