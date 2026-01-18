// Career totals scraper using Congress.gov API memberId
// Requires CONGRESS_API_KEY in environment

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const OUT_PATH = path.join(__dirname, '../public/senators-rankings.json');
const API_KEY = process.env.CONGRESS_API_KEY;

if (!API_KEY) {
  console.error("Missing CONGRESS_API_KEY environment variable");
  process.exit(1);
}

function ensureSchema(sen) {
  sen.congressgovId ??= null;
  sen.sponsoredBills ??= 0;
  sen.cosponsoredBills ??= 0;
  sen.becameLawBills ??= 0;
  sen.becameLawCosponsoredBills ??= 0;
  return sen;
}

async function countLegislation(memberId, sponsorship) {
  let total = 0;
  let url = `https://api.congress.gov/v3/member/${memberId}/legislation?sponsorship=${sponsorship}&api_key=${API_KEY}&limit=250`;

  while (url) {
    const resp = await axios.get(url, { timeout: 60000 });
    total += resp.data.pagination.count;
    url = resp.data.pagination.next;
  }
  return total;
}

(async () => {
  const sens = JSON.parse(fs.readFileSync(OUT_PATH, 'utf-8')).map(ensureSchema);

  for (const sen of sens) {
    if (!sen.congressgovId) {
      console.error(`No congressgovId for ${sen.name}`);
      continue;
    }
    try {
      const sponsored = await countLegislation(sen.congressgovId, 'Sponsored');
      const cosponsored = await countLegislation(sen.congressgovId, 'Cosponsored');

      sen.sponsoredBills = sponsored;
      sen.cosponsoredBills = cosponsored;
      console.log(`${sen.name}: sponsored=${sponsored}, cosponsored=${cosponsored}`);
    } catch (err) {
      console.error(`Failed for ${sen.name}: ${err.message}`);
    }
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(sens, null, 2));
  console.log('Senate legislation updated with career totals (via Congress.gov API)');
})();
