// Career totals scraper using Congress.gov member HTML pages
// Uses browser-like headers, retry/backoff, and slow pacing to avoid 403 blocks

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');

const OUT_PATH = path.join(__dirname, '../public/senators-rankings.json');

// Build a member URL from name + bioguide (slug is first-last lowercase)
function memberUrl(name, bioguideId) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  return `https://www.congress.gov/member/${slug}/${bioguideId}`;
}

function ensureSchema(sen) {
  sen.sponsoredBills ??= 0;
  sen.cosponsoredBills ??= 0;
  sen.becameLawBills ??= 0;
  sen.becameLawCosponsoredBills ??= 0;
  return sen;
}

// Browser-like headers to reduce blocking
const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
  'Referer': 'https://www.congress.gov/',
  'Connection': 'keep-alive',
};

// Sleep helpers
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const jitter = (base) => base + Math.floor(Math.random() * 1000); // add up to 1s jitter

async function fetchWithRetry(url, maxRetries = 4) {
  let attempt = 0;
  let delay = 4000; // start at 4s

  while (attempt <= maxRetries) {
    try {
      const resp = await axios.get(url, {
        timeout: 60000,
        headers: HEADERS,
        // No cookies; rely on headers + pacing
        validateStatus: (s) => s >= 200 && s < 500, // let us inspect 403
      });

      if (resp.status === 403) {
        throw new Error(`403`);
      }

      return resp.data;
    } catch (err) {
      attempt += 1;
      if (attempt > maxRetries) {
        throw new Error(`Failed after ${maxRetries} retries: ${err.message}`);
      }
      const wait = jitter(delay);
      console.warn(`Fetch blocked (${err.message}). Retry ${attempt}/${maxRetries} after ${wait}ms`);
      await sleep(wait);
      delay = Math.min(delay * 1.6, 15000); // backoff up to ~15s
    }
  }
}

function extractCounts(html) {
  const $ = cheerio.load(html);

  const sponsoredText = $('#facetItemsponsorshipSponsored_Legislationcount').text() || '';
  const cosponsoredText = $('#facetItemsponsorshipCosponsored_Legislationcount').text() || '';

  // Robust digit extraction: strip non-digits
  const sponsored = parseInt(sponsoredText.replace(/\D/g, ''), 10) || 0;
  const cosponsored = parseInt(cosponsoredText.replace(/\D/g, ''), 10) || 0;

  return { sponsored, cosponsored };
}

async function processSenator(sen) {
  const url = memberUrl(sen.name, sen.bioguideId);
  try {
    const html = await fetchWithRetry(url, 4);
    const { sponsored, cosponsored } = extractCounts(html);

    sen.sponsoredBills = sponsored;
    sen.cosponsoredBills = cosponsored;
    sen.becameLawBills = sen.becameLawBills || 0;
    sen.becameLawCosponsoredBills = sen.becameLawCosponsoredBills || 0;

    console.log(`${sen.name}: sponsored=${sponsored}, cosponsored=${cosponsored}`);
  } catch (err) {
    console.error(`Failed to fetch ${url}: ${err.message}`);
    // Keep zeros if blocked
    sen.sponsoredBills = sen.sponsoredBills || 0;
    sen.cosponsoredBills = sen.cosponsoredBills || 0;
  }
}

(async () => {
  const sens = JSON.parse(fs.readFileSync(OUT_PATH, 'utf-8')).map(ensureSchema);

  // Process sequentially with slow pacing to avoid blocks
  for (const sen of sens) {
    await processSenator(sen);
    await sleep(jitter(6000)); // ~6–7s between requests
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(sens, null, 2));
  console.log('Senate legislation updated with career totals (via Congress.gov HTML facets, paced + retries)');
})();
