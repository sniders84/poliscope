// Senate legislation scraper using Congress.gov search endpoint for 119th Congress
// Fetches search results, parses sponsor/cosponsor info, and counts totals per senator

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const OUT_PATH = path.join(__dirname, '../public/senators-rankings.json');
const CONGRESS = 119;
const PAGE_SIZE = 100; // Congress.gov search caps at 100 per page

const client = axios.create({
  baseURL: 'https://www.congress.gov',
  timeout: 20000,
  headers: {
    'User-Agent': 'poliscope/1.0',
    'Accept': 'application/json'
  },
  validateStatus: s => s >= 200 && s < 500
});

async function fetchAllBills() {
  let bills = [];
  let page = 1;
  while (true) {
    const url = `/search?q={"source":"legislation","congress":${CONGRESS}}&pageSize=${PAGE_SIZE}&page=${page}&format=json`;
    const resp = await client.get(url);
    const data = resp.data;
    if (!data || !data.results || data.results.length === 0) break;
    bills = bills.concat(data.results);
    if (data.results.length < PAGE_SIZE) break;
    page++;
  }
  return bills;
}

function countForSenator(bills, bioguideId) {
  const sponsored = bills.filter(b => b.sponsor?.bioguideId === bioguideId);
  const cosponsored = bills.filter(b => (b.cosponsors || []).some(c => c.bioguideId === bioguideId));

  const becameLawSponsored = sponsored.filter(b => (b.latestAction?.text || '').includes('Public Law')).length;
  const becameLawCosponsored = cosponsored.filter(b => (b.latestAction?.text || '').includes('Public Law')).length;

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

  console.log(`Fetching all bills for ${CONGRESS}th Congress via Congress.gov search...`);
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
  console.log('Senate legislation updated with 119th-only counts + accurate became-law detection (via Congress.gov search)');
})();
