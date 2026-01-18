// Career totals scraper (API) + enacted from direct GovTrack page scrape
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

async function getEnactedFromGovTrack(name, state, bioguideId) {
  // Construct direct GovTrack URL using name slug (lowercase, spaces to -)
  let slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z-]/g, '');
  let profileUrl = `https://www.govtrack.us/congress/members/${slug}/${bioguideId.toLowerCase()}`;

  // Fallback to numeric ID if needed (GovTrack uses numeric for some)
  if (!bioguideId.startsWith('S')) { // Senate Bioguide starts with S
    profileUrl = `https://www.govtrack.us/congress/members/${slug}/300000`; // placeholder - adjust if known
  }

  try {
    console.log(`Fetching GovTrack profile for ${name}: ${profileUrl}`);
    const resp = await axios.get(profileUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 60000
    });
    const $ = cheerio.load(resp.data);

    let enacted = 0;
    $('dt').each((i, el) => {
      const text = $(el).text().trim().toLowerCase();
      if (text.includes('enacted') || text.includes('bills enacted') || text.includes('laws')) {
        const dd = $(el).next('dd').text().trim();
        const match = dd.match(/(\d+)/);
        if (match) {
          enacted = parseInt(match[1], 10);
          console.log(`Parsed enacted for ${name}: ${enacted} from "${text}"`);
        }
      }
    });

    if (enacted === 0) {
      console.warn(`No enacted count found on GovTrack for ${name} — page may not have it or selector miss`);
    }

    return enacted;
  } catch (err) {
    console.error(`GovTrack direct URL error for ${name} (${profileUrl}): ${err.message}`);
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

      const enacted = await getEnactedFromGovTrack(sen.name, sen.state, sen.congressgovId);
      sen.becameLawBills = enacted;
      sen.becameLawCosponsoredBills = enacted; // Combined

      console.log(`${sen.name}: sponsored=${sen.sponsoredBills} (law=${sen.becameLawBills}), cosponsored=${sen.cosponsoredBills} (law=${sen.becameLawCosponsoredBills})`);
    } catch (err) {
      console.error(`Failed for ${sen.name}: ${err.message}`);
    }
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(sens, null, 2));
  console.log('Senate legislation updated with career totals + enacted from GovTrack direct URL');
})();
