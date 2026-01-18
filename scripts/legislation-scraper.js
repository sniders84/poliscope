// Career totals scraper for senators
// Pulls lifetime sponsored/cosponsored counts from Congress.gov profile pages

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const OUT_PATH = path.join(__dirname, '../public/senators-rankings.json');

const client = axios.create({
  timeout: 30000,
  headers: {
    'User-Agent': 'poliscope/1.0',
    'Accept': 'text/html'
  }
});

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getCareerTotals(bioguideId) {
  const url = `https://www.congress.gov/member/${bioguideId}`;
  try {
    const resp = await client.get(url);
    const html = resp.data;

    const sponsoredMatch = html.match(/Sponsored Bills:\s*([0-9,]+)/i);
    const cosponsoredMatch = html.match(/Cosponsored Bills:\s*([0-9,]+)/i);

    const sponsored = sponsoredMatch ? parseInt(sponsoredMatch[1].replace(/,/g, ''), 10) : 0;
    const cosponsored = cosponsoredMatch ? parseInt(cosponsoredMatch[1].replace(/,/g, ''), 10) : 0;

    return { sponsored, cosponsored };
  } catch (err) {
    console.error(`Failed to fetch career totals for ${bioguideId}: ${err.message}`);
    return { sponsored: 0, cosponsored: 0 };
  }
}

function ensureSchema(sen) {
  sen.sponsoredBills ??= 0;
  sen.cosponsoredBills ??= 0;
  sen.becameLawBills ??= 0; // career totals don’t separate became-law, leave 0
  sen.becameLawCosponsoredBills ??= 0;
  return sen;
}

(async () => {
  const sens = JSON.parse(fs.readFileSync(OUT_PATH, 'utf-8')).map(ensureSchema);

  for (const sen of sens) {
    const { sponsored, cosponsored } = await getCareerTotals(sen.bioguideId);
    sen.sponsoredBills = sponsored;
    sen.cosponsoredBills = cosponsored;
    sen.becameLawBills = 0;
    sen.becameLawCosponsoredBills = 0;
    console.log(`${sen.name}: sponsored=${sponsored}, cosponsored=${cosponsored}`);
    await sleep(5000); // pause between senators to avoid hammering
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(sens, null, 2));
  console.log('Senate legislation updated with career totals');
})();
