// Career totals scraper + enacted from GovTrack page scrape
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

async function getEnactedFromGovTrack(name, state) {
  const query = `${name} ${state}`.replace(/\s+/g, '+');
  const searchUrl = `https://www.govtrack.us/search?q=${query}+senator`;
  try {
    const searchResp = await axios.get(searchUrl, { timeout: 60000 });
    const $ = cheerio.load(searchResp.data);
    let profileUrl = $('.search-result a').first().attr('href');
    if (!profileUrl) return 0;

    profileUrl = 'https://www.govtrack.us' + profileUrl;
    const profileResp = await axios.get(profileUrl, { timeout: 60000 });
    const $$ = cheerio.load(profileResp.data);

    let enacted = 0;
    $$('dt').each((i, el) => {
      const text = $$(el).text().trim();
      if (text.includes('Bills Enacted') || text.includes('Enacted')) {
        const dd = $$(el).next('dd').text().trim();
        const match = dd.match(/\d+/);
        if (match) enacted = parseInt(match[0], 10);
      }
    });

    console.log(`GovTrack enacted count for ${name}: ${enacted}`);
    return enacted;
  } catch (err) {
    console.error(`GovTrack scrape error for ${name}: ${err.message}`);
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
      sen.sponsoredBills = await getTotalCount(sen.congressgovId, 'sponsored');
      sen.cosponsoredBills = await getTotalCount(sen.congressgovId, 'cosponsored');

      const enacted = await getEnactedFromGovTrack(sen.name, sen.state);
      sen.becameLawBills = enacted;
      sen.becameLawCosponsoredBills = enacted; // Combined, as GovTrack doesn't split

      console.log(`${sen.name}: sponsored=${sen.sponsoredBills} (law=${sen.becameLawBills}), cosponsored=${sen.cosponsoredBills} (law=${sen.becameLawCosponsoredBills})`);
    } catch (err) {
      console.error(`Failed for ${sen.name}: ${err.message}`);
    }
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(sens, null, 2));
  console.log('Senate legislation updated with career totals + enacted from GovTrack scrape');
})();
