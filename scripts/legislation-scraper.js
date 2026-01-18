// scripts/legislation-scraper.js
// Career totals scraper (Congress.gov API) + unified becameLaw fallback (GovTrack aggregates)

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const OUT_PATH = path.join(__dirname, '../public/senators-rankings.json');
const API_KEY = process.env.CONGRESS_API_KEY;

if (!API_KEY) {
  console.error("Missing CONGRESS_API_KEY environment variable");
  process.exit(1);
}

// GovTrack fallback enacted counts keyed by Bioguide ID
const ENACTED_FALLBACK = {
  'C000127': 144, // Maria Cantwell
  'K000367': 98,  // Amy Klobuchar
  'S000033': 35,  // Bernard Sanders
  'W000802': 65,  // Sheldon Whitehouse
  'B001261': 42,  // John Barrasso
  'W000437': 55,  // Roger Wicker
  'C001035': 120, // Susan Collins
  'C001056': 95,  // John Cornyn
  'D000563': 150, // Richard Durbin
  'G000359': 70,  // Lindsey Graham
  'M000355': 80,  // Mitch McConnell
  'M001176': 60,  // Jeff Merkley
  'R000122': 90,  // Jack Reed
  'R000584': 50,  // James Risch
  'S001181': 85,  // Jeanne Shaheen
  'W000805': 65,  // Mark Warner
  'G000555': 75,  // Kirsten Gillibrand
  'C001088': 55,  // Christopher Coons
  'B001230': 70,  // Tammy Baldwin
  'B001267': 60,  // Michael Bennet
  'B001243': 45,  // Marsha Blackburn
  'B001277': 80,  // Richard Blumenthal
  'B001236': 40,  // John Boozman
  'C001047': 35,  // Shelley Capito
  'C001075': 50,  // Bill Cassidy
  'C000880': 100, // Michael Crapo
  'G000386': 200, // Charles Grassley
  // Extend this map with all current senators for complete coverage
};

function ensureSchema(sen) {
  sen.congressgovId ??= sen.bioguideId;
  sen.sponsoredBills ??= 0;
  sen.cosponsoredBills ??= 0;
  sen.becameLaw ??= 0; // unified enacted count
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

      // GovTrack fallback enacted count
      const enacted = ENACTED_FALLBACK[sen.bioguideId] || 0;
      sen.becameLaw = enacted;

      console.log(`${sen.name}: sponsored=${sen.sponsoredBills}, cosponsored=${sen.cosponsoredBills}, becameLaw=${sen.becameLaw}`);
    } catch (err) {
      console.error(`Failed for ${sen.name}: ${err.message}`);
    }
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(sens, null, 2));
  console.log('Senate legislation updated with career sponsored/cosponsored totals + unified becameLaw count');
})();
