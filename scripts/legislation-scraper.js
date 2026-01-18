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

async function getLegislationStats(memberId, type) {  // type: 'sponsored' or 'cosponsored'
  const endpoint = `${type}-legislation`;
  let url = `https://api.congress.gov/v3/member/${memberId}/${endpoint}?limit=250&api_key=${API_KEY}`;
  let total = 0;
  let becameLaw = 0;

  while (url) {
    try {
      const resp = await axios.get(url, { timeout: 60000 });
      const dataKey = `${type}Legislation`;
      const items = resp.data?.[dataKey]?.item || [];

      total = resp.data?.pagination?.count || total;  // Set grand total once

      items.forEach(item => {
        const actionText = item.latestAction?.text || '';
        if (actionText.includes('Became Public Law No:') || actionText.includes('Became Private Law No:')) {
          becameLaw++;
        }
      });

      url = resp.data?.pagination?.next ? `${resp.data.pagination.next}&api_key=${API_KEY}` : null;
    } catch (err) {
      console.error(`API error for ${type} on ${memberId}: ${err.message}`);
      url = null;
    }
  }

  return { total, becameLaw };
}

(async () => {
  const sens = JSON.parse(fs.readFileSync(OUT_PATH, 'utf-8')).map(ensureSchema);
  for (const sen of sens) {
    if (!sen.congressgovId) {
      console.error(`No congressgovId for ${sen.name}`);
      continue;
    }
    try {
      const sponsored = await getLegislationStats(sen.congressgovId, 'sponsored');
      const cosponsored = await getLegislationStats(sen.congressgovId, 'cosponsored');

      sen.sponsoredBills = sponsored.total;
      sen.becameLawBills = sponsored.becameLaw;
      sen.cosponsoredBills = cosponsored.total;
      sen.becameLawCosponsoredBills = cosponsored.becameLaw;

      console.log(`${sen.name}: sponsored=${sen.sponsoredBills} (law=${sen.becameLawBills}), cosponsored=${sen.cosponsoredBills} (law=${sen.becameLawCosponsoredBills})`);
    } catch (err) {
      console.error(`Failed for ${sen.name}: ${err.message}`);
    }
  }
  fs.writeFileSync(OUT_PATH, JSON.stringify(sens, null, 2));
  console.log('Senate legislation updated with career totals (via Congress.gov API)');
})();
