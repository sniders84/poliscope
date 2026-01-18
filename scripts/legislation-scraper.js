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

async function getTotalCount(memberId, type) { // type: 'sponsored' or 'cosponsored'
  const endpoint = `${type}-legislation`;
  const url = `https://api.congress.gov/v3/member/${memberId}/${endpoint}?limit=1&api_key=${API_KEY}`; // limit=1 for count only
  try {
    const resp = await axios.get(url, { timeout: 60000 });
    return resp.data?.pagination?.count || 0;
  } catch (err) {
    console.error(`Total count error for ${type} on ${memberId}: ${err.message}`);
    return 0;
  }
}

async function getEnactedCount(bioguideId, role) { // role: 'sponsor' or 'cosponsor'
  const url = `https://api.congress.gov/v3/bill?sponsor=${bioguideId}&law-type=public&limit=1&api_key=${API_KEY}`;
  if (role === 'cosponsor') {
    url = url.replace('sponsor=', 'cosponsor=');
  }
  try {
    const resp = await axios.get(url, { timeout: 60000 });
    const count = resp.data?.pagination?.count || 0;
    console.log(`Enacted ${role} count for ${bioguideId}: ${count}`);
    return count;
  } catch (err) {
    console.error(`Enacted count error for ${role} on ${bioguideId}: ${err.message}`);
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
      // Totals from member endpoint (fast)
      sen.sponsoredBills = await getTotalCount(sen.congressgovId, 'sponsored');
      sen.cosponsoredBills = await getTotalCount(sen.congressgovId, 'cosponsored');

      // Enacted counts from bill endpoint filtered by law-type
      sen.becameLawBills = await getEnactedCount(sen.congressgovId, 'sponsor');
      sen.becameLawCosponsoredBills = await getEnactedCount(sen.congressgovId, 'cosponsor');

      console.log(`${sen.name}: sponsored=${sen.sponsoredBills} (law=${sen.becameLawBills}), cosponsored=${sen.cosponsoredBills} (law=${sen.becameLawCosponsoredBills})`);
    } catch (err) {
      console.error(`Failed for ${sen.name}: ${err.message}`);
    }
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(sens, null, 2));
  console.log('Senate legislation updated with career totals (via Congress.gov API)');
})();
