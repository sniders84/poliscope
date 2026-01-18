// 119th Congress totals scraper using Congress.gov API (Bioguide memberId)
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

async function getTotalCount(memberId, type) {
  const endpoint = `${type}-legislation`;
  const url = `https://api.congress.gov/v3/member/${memberId}/${endpoint}?congress=119&limit=1&api_key=${API_KEY}`;
  try {
    const resp = await axios.get(url, { timeout: 60000 });
    return resp.data?.pagination?.count || 0;
  } catch (err) {
    console.error(`Total count error for ${type} on ${memberId}: ${err.message}`);
    return 0;
  }
}

async function getSponsoredEnactedCount(bioguideId) {
  // Try with bill-type=hr,s (common for enacted public laws); congress=119
  const url = `https://api.congress.gov/v3/bill?congress=119&sponsor=${bioguideId}&law-type=public&bill-type=hr,s&limit=1&api_key=${API_KEY}`;
  console.log(`Calling enacted sponsored URL (119th): ${url}`);
  try {
    const resp = await axios.get(url, { timeout: 60000 });
    const pagination = resp.data?.pagination || {};
    console.log(`Enacted sponsored response pagination for ${bioguideId}:`, JSON.stringify(pagination, null, 2));
    const count = pagination.count || 0;
    console.log(`Enacted sponsored (119th public law) count for ${bioguideId}: ${count}`);
    return count;
  } catch (err) {
    console.error(`Enacted sponsored error for ${bioguideId}: ${err.message}`);
    return 0;
  }
}

async function getCosponsoredEnactedCount(memberId) {
  let url = `https://api.congress.gov/v3/member/${memberId}/cosponsored-legislation?congress=119&limit=250&api_key=${API_KEY}`;
  let enacted = 0;

  while (url) {
    try {
      const resp = await axios.get(url, { timeout: 60000 });
      const items = resp.data?.cosponsoredLegislation?.item || [];

      items.forEach(item => {
        const actionText = (item.latestAction?.text || '').toLowerCase().trim();
        if (actionText.includes('became public law') || actionText.includes('signed by president') || actionText.includes('enacted')) {
          enacted++;
        }
      });

      url = resp.data?.pagination?.next ? `${resp.data.pagination.next}&api_key=${API_KEY}` : null;
    } catch (err) {
      console.error(`Cosponsored enacted error on ${memberId}: ${err.message}`);
      url = null;
    }
  }

  if (enacted > 0) {
    console.log(`Enacted cosponsored in 119th for ${memberId}: ${enacted}`);
  } else {
    console.warn(`No enacted cosponsored detected for ${memberId} in 119th — expected early in Congress`);
  }

  return enacted;
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
      sen.sponsoredBills = await getTotalCount(sen.congressgovId, 'sponsored');
      sen.cosponsoredBills = await getTotalCount(sen.congressgovId, 'cosponsored');

      sen.becameLawBills = await getSponsoredEnactedCount(sen.congressgovId);
      sen.becameLawCosponsoredBills = await getCosponsoredEnactedCount(sen.congressgovId);

      console.log(`${sen.name}: sponsored=${sen.sponsoredBills} (law=${sen.becameLawBills}), cosponsored=${sen.cosponsoredBills} (law=${sen.becameLawCosponsoredBills})`);
    } catch (err) {
      console.error(`Failed for ${sen.name}: ${err.message}`);
    }
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(sens, null, 2));
  console.log('Senate legislation updated with 119th Congress totals (via Congress.gov API)');
})();
