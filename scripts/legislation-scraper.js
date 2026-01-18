// 119th Congress: Grab sponsored/cosponsored bills, then check each for became-law status
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

async function getBills(memberId, type) { // type: 'sponsored' or 'cosponsored'
  const endpoint = `${type}-legislation`;
  let url = `https://api.congress.gov/v3/member/${memberId}/${endpoint}?congress=119&limit=250&api_key=${API_KEY}`;
  let bills = [];

  while (url) {
    try {
      const resp = await axios.get(url, { timeout: 60000 });
      const dataKey = `${type}Legislation`;
      const items = resp.data?.[dataKey]?.item || [];
      bills = bills.concat(items.map(item => ({
        congress: item.congress,
        type: item.type,
        number: item.number
      })));

      url = resp.data?.pagination?.next ? `${resp.data.pagination.next}&api_key=${API_KEY}` : null;
    } catch (err) {
      console.error(`Error paginating ${type} for ${memberId}: ${err.message}`);
      url = null;
    }
  }

  return bills;
}

async function isEnacted(congress, type, number) {
  const url = `https://api.congress.gov/v3/bill/${congress}/${type.toLowerCase()}/${number}?api_key=${API_KEY}`;
  try {
    const resp = await axios.get(url, { timeout: 60000 });
    const bill = resp.data?.bill || {};
    const latestAction = bill.latestAction?.text || '';
    const lower = latestAction.toLowerCase();

    // Check for enacted indicators
    return lower.includes('became public law') ||
           lower.includes('became private law') ||
           lower.includes('signed by president') ||
           lower.includes('enacted') ||
           lower.includes('public law no:') ||
           bill.status?.toLowerCase().includes('enacted') ||
           bill.status?.toLowerCase().includes('law');
  } catch (err) {
    console.error(`Bill detail error for ${congress}/${type}/${number}: ${err.message}`);
    return false;
  }
}

async function countEnactedBills(bills) {
  let enacted = 0;
  for (const bill of bills) {
    if (await isEnacted(bill.congress, bill.type, bill.number)) {
      enacted++;
    }
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
      const sponsoredBills = await getBills(sen.congressgovId, 'sponsored');
      const cosponsoredBills = await getBills(sen.congressgovId, 'cosponsored');

      sen.sponsoredBills = sponsoredBills.length;
      sen.cosponsoredBills = cosponsoredBills.length;

      sen.becameLawBills = await countEnactedBills(sponsoredBills);
      sen.becameLawCosponsoredBills = await countEnactedBills(cosponsoredBills);

      console.log(`${sen.name}: sponsored=${sen.sponsoredBills} (law=${sen.becameLawBills}), cosponsored=${sen.cosponsoredBills} (law=${sen.becameLawCosponsoredBills})`);
    } catch (err) {
      console.error(`Failed for ${sen.name}: ${err.message}`);
    }
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(sens, null, 2));
  console.log('Senate legislation updated with 119th Congress bills + enacted filtered on detail endpoint');
})();
