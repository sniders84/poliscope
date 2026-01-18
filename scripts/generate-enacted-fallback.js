// scripts/generate-enacted-fallback.js
//
// Scrapes GovTrack member profile pages using senators.json links,
// joins with legislators-current.json to get bioguideId,
// and builds enacted-fallback.json keyed by bioguideId.

const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');

// Load both files
const senators = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/senators.json'), 'utf-8'));
const legislators = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/legislators-current.json'), 'utf-8'));

// Build lookup: govtrackId → bioguideId
const govtrackToBioguide = {};
for (const leg of legislators) {
  const bioguideId = leg.id?.bioguide;
  const govtrackId = leg.id?.govtrack;
  if (bioguideId && govtrackId) {
    govtrackToBioguide[govtrackId] = bioguideId;
  }
}

const enactedCounts = {};

async function scrapeGovTrack(link, govtrackId, name) {
  try {
    const resp = await axios.get(link, {
      timeout: 60000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 ' +
                      '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    const $ = cheerio.load(resp.data);
    const text = $('body').text();
    const match = text.match(/Bills enacted:\s*(\d+)/);

    if (match) {
      const bioguideId = govtrackToBioguide[govtrackId];
      if (bioguideId) {
        enactedCounts[bioguideId] = parseInt(match[1], 10);
        console.log(`${name} (${bioguideId}) → ${match[1]}`);
      } else {
        console.warn(`No bioguideId found for GovTrack ID ${govtrackId}`);
      }
    } else {
      console.warn(`No enacted count found for ${name}`);
    }
  } catch (err) {
    console.error(`Error scraping ${name}: ${err.message}`);
  }
}

(async () => {
  for (const sen of senators) {
    const govtrackLink = sen.govtrackLink;
    const name = sen.name;

    // Extract govtrackId from the link (last numeric segment)
    const match = govtrackLink.match(/\/(\d+)(?:\/|$)/);
    const govtrackId = match ? match[1] : null;

    if (govtrackId && govtrackLink) {
      await scrapeGovTrack(govtrackLink, govtrackId, name);
    } else {
      console.warn(`Missing govtrackId for ${name}`);
    }
  }

  const outputPath = path.join(__dirname, '../public/enacted-fallback.json');
  fs.writeFileSync(outputPath, JSON.stringify(enactedCounts, null, 2));
  console.log(`Generated enacted-fallback.json with ${Object.keys(enactedCounts).length} entries`);
})();
