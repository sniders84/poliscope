// Career totals scraper using Congress.gov member HTML pages
// Reads senators JSON, hits /member/{slug}/{bioguide}, extracts facet counts

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');

const OUT_PATH = path.join(__dirname, '../public/senators-rankings.json');

// Build a member URL from name + bioguide (slug is first-last lowercase)
function memberUrl(name, bioguideId) {
  // Normalize: keep letters/spaces/hyphens, collapse spaces to hyphens
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

async function fetchCountsFromMemberPage(url) {
  try {
    const resp = await axios.get(url, {
      timeout: 60000,
      headers: {
        'User-Agent': 'poliscope-scraper/1.0',
        'Accept': 'text/html,application/xhtml+xml',
      }
    });
    const $ = cheerio.load(resp.data);

    // Facet counts live under #innerbox_sponsorship
    const sponsoredText = $('#facetItemsponsorshipSponsored_Legislationcount').text() || '';
    const cosponsoredText = $('#facetItemsponsorshipCosponsored_Legislationcount').text() || '';

    // Valid regex to capture digits inside [ ]
    const sponsoredMatch = sponsoredText.match(/

\[(\d+)\]

/);
    const cosponsoredMatch = cosponsoredText.match(/

\[(\d+)\]

/);

    const sponsored = sponsoredMatch ? parseInt(sponsoredMatch[1], 10) : 0;
    const cosponsored = cosponsoredMatch ? parseInt(cosponsoredMatch[1], 10) : 0;

    return { sponsored, cosponsored };
  } catch (err) {
    console.error(`Failed to fetch ${url}: ${err.message}`);
    return { sponsored: 0, cosponsored: 0 };
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
  const sens = JSON.parse(fs.readFileSync(OUT_PATH, 'utf-8')).map(ensureSchema);

  for (const sen of sens) {
    const url = memberUrl(sen.name, sen.bioguideId);
    const { sponsored, cosponsored } = await fetchCountsFromMemberPage(url);

    sen.sponsoredBills = sponsored;
    sen.cosponsoredBills = cosponsored;
    // Congress.gov facet doesn’t expose “became law” totals here—leave at 0
    sen.becameLawBills = sen.becameLawBills || 0;
    sen.becameLawCosponsoredBills = sen.becameLawCosponsoredBills || 0;

    console.log(`${sen.name}: sponsored=${sponsored}, cosponsored=${cosponsored}`);
    await sleep(3000); // gentle pacing to avoid anti-bot triggers
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(sens, null, 2));
  console.log('Senate legislation updated with career totals (via Congress.gov HTML facets)');
})();
