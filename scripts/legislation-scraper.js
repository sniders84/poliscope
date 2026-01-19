// scripts/legislation-scraper.js
//
// Purpose: Fetch career totals for sponsored, cosponsored, becameLawSponsored, becameLawCosponsored
// Source: Congress.gov member profile pages (bioguide-based URLs)
// Output: public/legislation-senators.json

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const legislatorsPath = path.join(__dirname, '../public/legislators-current.json');
const outputPath = path.join(__dirname, '../public/legislation-senators.json');

const legislators = JSON.parse(fs.readFileSync(legislatorsPath, 'utf-8'));

// Helper: fetch with retries
async function getWithRetry(url, tries = 3) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      const resp = await axios.get(url);
      return resp.data;
    } catch (err) {
      lastErr = err;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw lastErr;
}

// Extract numbers from Congress.gov profile HTML
function extractTotals(html) {
  function extract(regex) {
    const m = html.match(regex);
    return m ? Number(m[1]) : 0;
  }

  return {
    sponsored: extract(/Sponsored Bills:\s*<\/span>\s*<span[^>]*>(\d+)/i),
    cosponsored: extract(/Cosponsored Bills:\s*<\/span>\s*<span[^>]*>(\d+)/i),
    becameLawSponsored: extract(/Sponsored Bills that Became Law:\s*<\/span>\s*<span[^>]*>(\d+)/i),
    becameLawCosponsored: extract(/Cosponsored Bills that Became Law:\s*<\/span>\s*<span[^>]*>(\d+)/i),
  };
}

(async () => {
  const results = [];

  for (const leg of legislators) {
    const bioguideId = leg.id?.bioguide;
    if (!bioguideId) continue;

    const name = `${leg.name.first} ${leg.name.last}`;
    const state = leg.terms?.[leg.terms.length - 1]?.state || '';
    const party = leg.terms?.[leg.terms.length - 1]?.party || '';

    try {
      // Direct Congress.gov profile URL using bioguide
      const url = `https://www.congress.gov/member/${name.toLowerCase().replace(/ /g, '-')}/${bioguideId}`;
      const html = await getWithRetry(url, 3);

      const totals = extractTotals(html);

      results.push({
        bioguideId,
        name,
        state,
        party,
        sponsored: totals.sponsored,
        cosponsored: totals.cosponsored,
        becameLawSponsored: totals.becameLawSponsored,
        becameLawCosponsored: totals.becameLawCosponsored,
      });

      console.log(
        `${name}: sponsored=${totals.sponsored}, cosponsored=${totals.cosponsored}, ` +
        `becameLawSponsored=${totals.becameLawSponsored}, becameLawCosponsored=${totals.becameLawCosponsored}`
      );
    } catch (err) {
      console.error(`Error for ${bioguideId} (${name}): ${err.message}`);
    }
  }

  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`Wrote ${results.length} senator records to ${outputPath}`);
})();
