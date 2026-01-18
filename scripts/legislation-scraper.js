// Career totals scraper (API) + became law from Congress.gov member page scrape
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

async function getBecameLawCount(bioguideId, retries = 3) {
  const url = `https://www.congress.gov/member/${bioguideId}`;
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1'
  };

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const resp = await axios.get(url, { headers, timeout: 60000 });
      const $ = cheerio.load(resp.data);

      let count = 0;
      $('.facet-item').each((i, el) => {
        const text = $(el).text().trim();
        if (text.includes('Became Law')) {
          const match = text.match(/\[\s*(\d+)\s*\]/);
          if (match) {
            count = parseInt(match[1], 10);
            console.log(`Parsed Became Law count for ${bioguideId}: ${count}`);
          }
        }
      });

      if (count > 0) return count;

      console.warn(`No Became Law count found on page for ${bioguideId} (attempt ${attempt})`);
    } catch (err) {
      console.error(`Congress.gov scrape error for ${bioguideId} (attempt ${attempt}): ${err.message}`);
      if (attempt < retries) await new Promise(resolve => setTimeout(resolve, 2000)); // 2s backoff
    }
  }

  console.error(`Failed to get Became Law count for ${bioguideId} after ${retries} attempts`);
  return 0;
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

      const becameLaw = await getBecameLawCount(sen.congressgovId);
      sen.becameLawBills = becameLaw;
      sen.becameLawCosponsoredBills = becameLaw; // Combined

      console.log(`${sen.name}: sponsored=${sen.sponsoredBills} (law=${sen.becameLawBills}), cosponsored=${sen.cosponsoredBills} (law=${sen.becameLawCosponsoredBills})`);
    } catch (err) {
      console.error(`Failed for ${sen.name}: ${err.message}`);
    }
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(sens, null, 2));
  console.log('Senate legislation updated with career totals + became law from Congress.gov page scrape');
})();
