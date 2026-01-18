// Career totals scraper (API) + enacted from GovTrack page scrape (improved)
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');

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
  const query = encodeURIComponent(`${name} ${state}`);
  const searchUrl = `https://www.govtrack.us/search?q=${query}+senator`;
  try {
    const searchResp = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 60000
    });
    const $ = cheerio.load(searchResp.data);

    // Improved selector: look for links in search results with senator profiles
    let profileUrl = null;
    $('a').each((i, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().trim();
      if (href && href.includes('/congress/members/') && text.includes(name)) {
        profileUrl = 'https://www.govtrack.us' + href;
        return false; // stop on first match
      }
    });

    if (!profileUrl) {
      console.warn(`No GovTrack profile link found for ${name} in search results`);
      return 0;
    }

    const profileResp = await axios.get(profileUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 60000
    });
    const $$ = cheerio.load(profileResp.data);

    let enacted = 0;
    $$('dt').each((i, el) => {
      const text = $$(el).text().trim();
      if (text.toLowerCase().includes('enacted') || text.toLowerCase().includes('bills enacted') || text.toLowerCase().includes('laws')) {
        const dd = $$(el).next('dd').text().trim();
        const match = dd.match(/(\d+)/);
        if (match) {
          enacted = parseInt(match[1], 10);
          console.log(`Parsed enacted for ${name}: ${enacted} from "${text}"`);
        }
      }
    });

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
      sen.becameLawCosponsoredBills = enacted;

      console.log(`${sen.name}: sponsored=${sen.sponsoredBills} (law=${sen.becameLawBills}), cosponsored=${sen.cosponsoredBills} (law=${sen.becameLawCosponsoredBills})`);
    } catch (err) {
      console.error(`Failed for ${sen.name}: ${err.message}`);
    }
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(sens, null, 2));
  console.log('Senate legislation updated with career totals + enacted from GovTrack');
})();
