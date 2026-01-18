// Career totals scraper using Congress.gov API
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

// Resolve congress.gov memberId from bioguideId
async function resolveMemberId(bioguideId) {
  const url = `https://api.congress.gov/v3/member/${bioguideId}?api_key=${API_KEY}`;
  const resp = await axios.get(url, { timeout: 60000 });
  return resp.data.member.memberId;
}

// Count sponsored/cosponsored totals via API
async function fetchLegislationCounts(memberId) {
  let sponsored = 0;
  let cosponsored = 0;

  // Sponsored
  let url = `https://api.congress.gov/v3/member/${memberId}/sponsored-legislation?api_key=${API_KEY}&limit=250`;
  while (url) {
    const resp = await axios.get(url, { timeout: 60000 });
    sponsored += resp.data.pagination.count;
    url = resp.data.pagination.next;
  }

  // Cosponsored
  url = `https://api.congress.gov/v3/member/${memberId}/cosponsored-legislation?api_key=${API_KEY}&limit=250`;
  while (url) {
    const resp = await axios.get(url, { timeout: 60000 });
    cosponsored += resp.data.pagination.count;
    url = resp.data.pagination.next;
  }

  return { sponsored, cosponsored };
}

(async () => {
  const sens = JSON.parse(fs.readFileSync(OUT_PATH, 'utf-8')).map(ensureSchema);

  for (const sen of sens) {
    try {
      if (!sen.congressgovId) {
        sen.congressgovId = await resolveMemberId(sen.bioguideId);
      }
      const { sponsored, cosponsored } = await fetchLegislationCounts(sen.congressgovId);

      sen.sponsoredBills = sponsored;
      sen.cosponsoredBills = cosponsored;
      // Congress.gov API doesn’t expose “became law” totals directly — leave at 0
      console.log(`${sen.name}: sponsored=${sponsored}, cosponsored=${cosponsored}`);
    } catch (err) {
      console.error(`Failed for ${sen.name}: ${err.message}`);
    }
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(sens, null, 2));
  console.log('Senate legislation updated with career totals (via Congress.gov API)');
})();
