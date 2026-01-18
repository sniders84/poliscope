// scripts/legislation-scraper.js
//
// Scrapes legislation data and fills schema,
// wired to load enacted-fallback.json for becameLaw counts.

const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Load enacted fallback JSON
const ENACTED_FALLBACK = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../public/enacted-fallback.json'), 'utf-8')
);

// Load legislators roster
const legislators = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../public/legislators-current.json'), 'utf-8')
);

const outputPath = path.join(__dirname, '../public/legislation-senators.json');

// Example Congress.gov fetch stub
async function fetchLegislation(bioguideId) {
  // Replace with real API logic
  return {
    sponsored: Math.floor(Math.random() * 50),
    cosponsored: Math.floor(Math.random() * 100)
  };
}

(async () => {
  const results = [];

  for (const leg of legislators) {
    const bioguideId = leg.id?.bioguide;
    if (!bioguideId) continue;

    const legisData = await fetchLegislation(bioguideId);
    const becameLawCount = ENACTED_FALLBACK[bioguideId] || 0;

    results.push({
      bioguideId,
      name: `${leg.name.first} ${leg.name.last}`,
      state: leg.terms?.[leg.terms.length - 1]?.state || '',
      party: leg.terms?.[leg.terms.length - 1]?.party || '',
      sponsored: legisData.sponsored,
      cosponsored: legisData.cosponsored,
      becameLaw: becameLawCount
    });
  }

  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`Wrote ${results.length} senator records to ${outputPath}`);
})();
