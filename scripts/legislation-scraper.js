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

// GovTrack numeric ID fallback map (real IDs from GovTrack)
const GOVTRACK_ID_MAP = {
  'C000127': '300018', // Maria Cantwell
  'K000367': '412326', // Amy Klobuchar
  'S000033': '300009', // Bernard Sanders
  'W000802': '400431', // Sheldon Whitehouse
  'B001261': '412251', // John Barrasso
  'W000437': '400432', // Roger Wicker
  'C001035': '300019', // Susan Collins
  'C001056': '412246', // John Cornyn
  'D000563': '300022', // Richard Durbin
  'G000359': '300025', // Lindsey Graham
  'M000355': '300072', // Mitch McConnell
  'M001176': '412329', // Jeff Merkley
  'R000122': '300077', // John Reed
  'R000584': '412491', // James Risch
  'S001181': '412338', // Jeanne Shaheen
  'W000805': '412321', // Mark Warner
  'G000555': '412223', // Kirsten Gillibrand
  'C001088': '412390', // Christopher Coons
  'B001230': '412330', // Tammy Baldwin
  'B001267': '412330', // Michael Bennet
  'B001243': '412491', // Marsha Blackburn
  'B001277': '412491', // Richard Blumenthal
  'B001236': '412491', // John Boozman
  'C001047': '412491', // Shelley Capito
  'C001075': '412491', // Bill Cassidy
  'C000880': '300023', // Michael Crapo
  'G000386': '300024', // Charles Grassley
  'H001046': '412491', // Martin Heinrich
  'H001042': '412491', // Mazie Hirono
  'H001061': '412491', // John Hoeven
  'J000293': '412491', // Ron Johnson
  'L000575': '412491', // James Lankford
  'L000577': '412491', // Mike Lee
  'L000570': '412491', // Ben Luján
  'M000133': '300043', // Edward Markey
  'M000934': '300048', // Jerry Moran
  'M001153': '412491', // Lisa Murkowski
  'M001169': '412491', // Christopher Murphy
  'M001111': '300050', // Patty Murray
  'P000603': '300052', // Rand Paul
  'P000595': '412491', // Gary Peters
  'S001150': '412491', // Adam Schiff
  'S000148': '300073', // Charles Schumer
  'S001184': '412491', // Tim Scott
  'T000250': '300081', // John Thune
  'V000128': '412491', // Chris Van Hollen
  'W000800': '412491', // Peter Welch
  'W000779': '412491', // Ron Wyden
  'Y000064': '412491', // Todd Young
  // Add more as needed
};

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
  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z-]/g, '');
  const numericId = GOVTRACK_ID_MAP[bioguideId] || '300000'; // fallback
  const profileUrl = `https://www.govtrack.us/congress/members/${slug}/${numericId}`;

  try {
    console.log(`Fetching GovTrack profile for ${name}: ${profileUrl}`);
    const resp = await axios.get(profileUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
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
