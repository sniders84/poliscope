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

async function getLegislationCounts(memberId, type) { // type: 'sponsored' or 'cosponsored'
  const endpoint = `${type}-legislation`;
  let url = `https://api.congress.gov/v3/member/${memberId}/${endpoint}?congress=119&limit=250&api_key=${API_KEY}`;
  let total = 0;
  let enacted = 0;
  let sampleEnactedText = null;

  while (url) {
    try {
      const resp = await axios.get(url, { timeout: 60000 });
      const dataKey = `${type}Legislation`;
      const items = resp.data?.[dataKey]?.item || [];

      if (total === 0) {
        total = resp.data?.pagination?.count || items.length;
      }

      items.forEach(item => {
        const actionText = (item.latestAction?.text || '').trim();
        const lower = actionText.toLowerCase();
        if (lower.includes('became public law') || 
            lower.includes('signed by president') || 
            lower.includes('enacted') || 
            lower.includes('public law no:') ||
            lower.includes('approved by president')) {
          enacted++;
          if (!sampleEnactedText) sampleEnactedText = actionText; // Sample one for debug
        }
      });

      url = resp.data?.pagination?.next ? `${resp.data.pagination.next}&api_key=${API_KEY}` : null;
    } catch (err) {
      console.error(`Error paginating ${type} for ${memberId}: ${err.message}`);
      url = null;
    }
  }

  if (enacted > 0 && sampleEnactedText) {
    console.log(`Sample enacted action text for ${type} (${memberId}): "${sampleEnactedText}"`);
  } else if (enacted === 0 && total > 0) {
    console.warn(`No enacted detected for ${type} on ${memberId} despite ${total} items in 119th`);
  }

  return { total, enacted };
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
      const sponsored = await getLegislationCounts(sen.congressgovId, 'sponsored');
      const cosponsored = await getLegislationCounts(sen.congressgovId, 'cosponsored');

      sen.sponsoredBills = sponsored.total;
      sen.becameLawBills = sponsored.enacted;
      sen.cosponsoredBills = cosponsored.total;
      sen.becameLawCosponsoredBills = cosponsored.enacted;

      console.log(`${sen.name}: sponsored=${sen.sponsoredBills} (law=${sen.becameLawBills}), cosponsored=${sen.cosponsoredBills} (law=${sen.becameLawCosponsoredBills})`);
    } catch (err) {
      console.error(`Failed for ${sen.name}: ${err.message}`);
    }
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(sens, null, 2));
  console.log('Senate legislation updated with 119th Congress totals (via Congress.gov API)');
})();
