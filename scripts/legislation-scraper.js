// Career sponsored/cosponsored totals scraper (simple, reliable version)
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

async function getTotal(memberId, type) {
  const endpoint = `${type}-legislation`;
  const url = `https://api.congress.gov/v3/member/${memberId}/${endpoint}?limit=1&api_key=${API_KEY}`;
  try {
    const resp = await axios.get(url, { timeout: 60000 });
    const count = resp.data?.pagination?.count;
    console.log(`${type} count for ${memberId}: ${count}`);
    return count || 0;
  } catch (err) {
    console.error(`Error getting ${type} for ${memberId}: ${err.message}`);
    return 0;
  }
}

(async () => {
  let sens;
  try {
    sens = JSON.parse(fs.readFileSync(OUT_PATH, 'utf-8')).map(ensureSchema);
  } catch (err) {
    console.error(`Failed to read ${OUT_PATH}: ${err.message}`);
    process.exit(1);
  }

  for (const sen of sens) {
    if (!sen.congressgovId) {
      console.error(`No congressgovId for ${sen.name}`);
      continue;
    }
    try {
      sen.sponsoredBills = await getTotal(sen.congressgovId, 'sponsored');
      sen.cosponsoredBills = await getTotal(sen.congressgovId, 'cosponsored');

      sen.becameLawBills = 0;
      sen.becameLawCosponsoredBills = 0;

      console.log(`${sen.name}: sponsored=${sen.sponsoredBills} (law=${sen.becameLawBills}), cosponsored=${sen.cosponsoredBills} (law=${sen.becameLawCosponsoredBills})`);
    } catch (err) {
      console.error(`Failed for ${sen.name}: ${err.message}`);
    }
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(sens, null, 2));
  console.log('Senate legislation updated with career sponsored/cosponsored totals (enacted=0)');
})();
