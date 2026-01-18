// Career sponsored/cosponsored totals scraper (robust retry + fallback for flaky sponsored)
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const OUT_PATH = path.join(__dirname, '../public/senators-rankings.json');
const API_KEY = process.env.CONGRESS_API_KEY;

if (!API_KEY) {
  console.error("Missing CONGRESS_API_KEY environment variable");
  process.exit(1);
}

// Static fallback for sponsored counts (from Congress.gov profiles)
// Add more as needed; this prevents 0 for known high-activity senators
const FALLBACK_SPONSORED = {
  'C000127': 966, // Maria Cantwell
  'K000367': 1400, // Amy Klobuchar
  'S000033': 1151, // Bernard Sanders
  'W000802': 727, // Sheldon Whitehouse
  'B001261': 692, // John Barrasso
  'W000437': 745, // Roger Wicker
  'C001035': 1189, // Susan Collins
  'C001056': 1582, // John Cornyn
  'D000563': 2090, // Richard Durbin
  'G000359': 749, // Lindsey Graham
  'M000355': 1294, // Mitch McConnell
  'M001176': 1186, // Jeff Merkley
  'R000122': 1245, // John Reed
  'R000584': 629, // James Risch
  'S001181': 1149, // Jeanne Shaheen
  'W000805': 716, // Mark Warner
  'G000555': 888, // Kirsten Gillibrand
  'C001088': 749, // Christopher Coons
  'B001230': 720, // Tammy Baldwin
  'B001267': 855, // Michael Bennet
  'B001243': 769, // Marsha Blackburn
  'B001277': 1049, // Richard Blumenthal
  'B001236': 395, // John Boozman
  'C001047': 387, // Shelley Capito
  'C001075': 678, // Bill Cassidy
  'C000880': 616, // Michael Crapo
  'G000386': 2446, // Charles Grassley
  'H001046': 529, // Martin Heinrich
  'H001042': 736, // Mazie Hirono
  'H001061': 491, // John Hoeven
  'J000293': 594, // Ron Johnson
  'L000575': 644, // James Lankford
  'L000577': 2054, // Mike Lee
  'L000570': 470, // Ben Luján
  'M000133': 1617, // Edward Markey
  'M000934': 759, // Jerry Moran
  'M001153': 1180, // Lisa Murkowski
  'M001169': 572, // Christopher Murphy
  'M001111': 1163, // Patty Murray
  'P000603': 1090, // Rand Paul
  'P000595': 859, // Gary Peters
  'S001150': 449, // Adam Schiff
  'S000148': 2427, // Charles Schumer
  'S001184': 440, // Tim Scott
  'T000250': 1024, // John Thune
  'V000128': 564, // Chris Van Hollen
  'W000800': 648, // Peter Welch
  'W000779': 1870, // Ron Wyden
  'Y000064': 405, // Todd Young
  // Add more as you see failures
};

function ensureSchema(sen) {
  sen.congressgovId ??= null;
  sen.sponsoredBills ??= 0;
  sen.cosponsoredBills ??= 0;
  sen.becameLawBills ??= 0;
  sen.becameLawCosponsoredBills ??= 0;
  return sen;
}

async function getTotal(memberId, type, retries = 5) {
  const endpoint = `${type}-legislation`;
  const url = `https://api.congress.gov/v3/member/${memberId}/${endpoint}?limit=1&api_key=${API_KEY}`;
  let lastCount = 0;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const resp = await axios.get(url, { timeout: 60000 });
      const count = resp.data?.pagination?.count;
      if (count !== undefined && count > 0) {
        console.log(`${type} count for ${memberId} (attempt ${attempt}): ${count}`);
        return count;
      } else {
        console.warn(`${type} count for ${memberId} (attempt ${attempt}): undefined or 0`);
        if (count !== undefined) lastCount = count;
      }
    } catch (err) {
      console.error(`Error getting ${type} for ${memberId} (attempt ${attempt}): ${err.message}`);
    }
    if (attempt < retries) await new Promise(resolve => setTimeout(resolve, 1500)); // 1.5s backoff
  }

  // Fallback to static map if API failed
  if (type === 'sponsored' && FALLBACK_SPONSORED[memberId]) {
    console.log(`Using fallback sponsored for ${memberId}: ${FALLBACK_SPONSORED[memberId]}`);
    return FALLBACK_SPONSORED[memberId];
  }

  console.error(`Failed to get reliable ${type} for ${memberId} after ${retries} attempts — using last known: ${lastCount}`);
  return lastCount;
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
      sen.sponsoredBills = await getTotal(sen.congressgovId, 'sponsored');
      sen.cosponsoredBills = await getTotal(sen.congressgovId, 'cosponsored');

      sen.becameLawBills = 0;
      sen.becameLawCosponsoredBills = 0;

      console.log(`${sen.name}: sponsored=${sen.sponsoredBills} (law=${sen.becameLawBills}), cosponsored=${sen.cosponsoredBills} (law=${sen.becameLawCosponsoredBills})`);
    } catch (err) {
      console.error(`Failed for ${sen.name}: ${err.message}`);
    }
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(sens, null, 2));
  console.log('Senate legislation updated with career sponsored/cosponsored totals (enacted=0)');
})();
