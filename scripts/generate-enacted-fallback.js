// scripts/generate-enacted-fallback.js
//
// Full replacement file: scrapes GovTrack member profile pages
// and builds enacted-fallback.json keyed by bioguideId.

const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');

// Load your senators.json (must include bioguideId + govtrackLink for each senator)
const senators = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../public/senators.json'), 'utf-8')
);

const enactedCounts = {};

async function scrapeGovTrack(link, bioguideId, name) {
  try {
    const resp = await axios.get(link, { timeout: 60000 });
    const $ = cheerio.load(resp.data);

    // Look for "Bills enacted: <number>" text anywhere in the page
    const text = $('body').text();
    const match = text.match(/Bills enacted:\s*(\d+)/);

    if (match) {
      enactedCounts[bioguideId] = parseInt(match[1], 10);
      console.log(`${name} (${bioguideId}) → ${match[1]}`);
    } else {
      console.warn(`No enacted count found for ${name} (${bioguideId})`);
    }
  } catch (err) {
    console.error(`Error scraping ${name} (${bioguideId}): ${err.message}`);
  }
}

(async () => {
  for (const sen of senators) {
    const bioguideId = sen.bioguideId; // ensure this field exists in senators.json
    const govtrackLink = sen.govtrackLink;
    const name = sen.name;

    if (bioguideId && govtrackLink) {
      await scrapeGovTrack(govtrackLink, bioguideId, name);
    } else {
      console.warn(`Missing bioguideId or govtrackLink for ${name}`);
    }
  }

  // Write out the complete fallback JSON
  const outputPath = path.join(__dirname, '../public/enacted-fallback.json');
  fs.writeFileSync(outputPath, JSON.stringify(enactedCounts, null, 2));
  console.log(`Generated enacted-fallback.json with ${Object.keys(enactedCounts).length} entries`);
})();
