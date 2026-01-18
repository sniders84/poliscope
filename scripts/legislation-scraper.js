// Career totals scraper using Congress.gov API (Bioguide memberId)
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

async function getLegislationCount(memberId, type, countBecameLaw = false) {
  const endpoint = type === 'sponsored' ? 'sponsored-legislation' : 'cosponsored-legislation';
  let url = `https://api.congress.gov/v3/member/${memberId}/${endpoint}?limit=250&api_key=${API_KEY}`;
  
  let total = 0;
  let becameLaw = 0;

  if (!countBecameLaw) {
    // For simple total, one call is enough to get pagination.count (grand total)
    const resp = await axios.get(url, { timeout: 60000 });
    return resp.data.pagination.count;
  } else {
    // For became-law count, paginate and filter items
    while (url) {
      const resp = await axios.get(url, { timeout: 60000 });
      total = resp.data.pagination.count; // Set once (grand total)

      // Filter items where latestAction.text indicates became law
      const items = resp.data[`${type}Legislation`].item || [];
      items.forEach(item => {
        const actionText = item.latestAction?.text || '';
        if (actionText.includes('Became Public Law No:') || actionText.includes('Became Private Law No:')) {
          becameLaw++;
        }
      });

      url = resp.data.pagination.next ? `${resp.data.pagination.next}&api_key=${API_KEY}` : null;
    }
    return { total, becameLaw };
  }
}

(async () => {
  const sens = JSON.parse(fs.readFileSync(OUT_PATH, 'utf-8')).map(ensureSchema);
  for (const sen of sens) {
    if (!sen.congressgovId) {
      console.error(`No congressgovId for ${sen.name}`);
      continue;
    }
    try {
      // Get sponsored totals
      const sponsoredResult = await getLegislationCount(sen.congressgovId, 'sponsored', true);
      sen.sponsoredBills = sponsoredResult.total;
      sen.becameLawBills = sponsoredResult.becameLaw;

      // Get cosponsored totals
      const cosponsoredResult = await getLegislationCount(sen.congressgovId, 'cosponsored', true);
      sen.cosponsoredBills = cosponsoredResult.total;
      sen.becameLawCosponsoredBills = cosponsoredResult.becameLaw;

      console.log(`${sen.name}: sponsored=${sen.sponsoredBills} (becameLaw=${sen.becameLawBills}), cosponsored=${sen.cosponsoredBills} (becameLaw=${sen.becameLawCosponsoredBills})`);
    } catch (err) {
      console.error(`Failed for ${sen.name}: ${err.message}`);
    }
  }
  fs.writeFileSync(OUT_PATH, JSON.stringify(sens, null, 2));
  console.log('Senate legislation updated with career totals (via Congress.gov API)');
})();
