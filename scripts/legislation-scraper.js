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

async function getTotalCount(memberId, type) {
  const endpoint = `${type}-legislation`;
  const url = `https://api.congress.gov/v3/member/${memberId}/${endpoint}?limit=1&api_key=${API_KEY}`;
  try {
    const resp = await axios.get(url, { timeout: 60000 });
    return resp.data?.pagination?.count || 0;
  } catch (err) {
    console.error(`Total count error for ${type} on ${memberId}: ${err.message}`);
    return 0;
  }
}

async function getSponsoredEnactedCount(bioguideId) {
  let url = `https://api.congress.gov/v3/bill?sponsor=${bioguideId}&law-type=public&limit=1&api_key=${API_KEY}`;
  try {
    const resp = await axios.get(url, { timeout: 60000 });
    const count = resp.data?.pagination?.count || 0;
    console.log(`Enacted sponsored (public law) count for ${bioguideId}: ${count}`);
    return count;
  } catch (err) {
    console.error(`Enacted sponsored error for ${bioguideId}: ${err.message}`);
    return 0;
  }
}

async function getCosponsoredEnactedCount(memberId) {
  let url = `https://api.congress.gov/v3/member/${memberId}/cosponsored-legislation?limit=250&api_key=${API_KEY}`;
  let enacted = 0;
  let sampledAction = null; // For debug

  while (url) {
    try {
      const resp = await axios.get(url, { timeout: 60000 });
      const items = resp.data?.cosponsoredLegislation?.item || [];

      items.forEach(item => {
        const actionText = (item.latestAction?.text || '').trim();
        const lower = actionText.toLowerCase();
        if (lower.includes('became public law no:') || lower.includes('became public law')) {
          enacted++;
          if (!sampledAction) sampledAction = actionText; // Sample one for log
        }
      });

      url = resp.data?.pagination?.next ? `${resp.data.pagination.next}&api_key=${API_KEY}` : null;
    } catch (err) {
      console.error(`Cosponsored enacted error on ${memberId}: ${err.message}`);
      url = null;
    }
  }

  if (sampledAction) {
    console.log(`Sample latestAction.text for potential enacted cosponsored bill on ${memberId}: "${sampledAction}"`);
  } else if (enacted === 0) {
    console.warn(`No enacted cosponsored detected for ${memberId} — check if latestAction has enacted info`);
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
  console.log('Senate legislation updated with career totals (via Congress.gov API)');
})();
