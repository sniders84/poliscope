// Purpose: Generate baseline senators-rankings.json from local legislators-current.json
// Filters for current Senators, initializes full schema, and enriches with Congress.gov bioguideId as congressgovId
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const ROSTER_PATH = path.join(__dirname, '..', 'public', 'legislators-current.json');
const OUT_PATH = path.join(__dirname, '..', 'public', 'senators-rankings.json');
const API_KEY = process.env.CONGRESS_API_KEY;

if (!API_KEY) {
  console.error("Missing CONGRESS_API_KEY environment variable");
  process.exit(1);
}

// Fetch all current Senate members for the 119th Congress
async function fetchSenateMembers() {
  const url = `https://api.congress.gov/v3/member?chamber=senate&congress=119&limit=250&api_key=${API_KEY}`;
  try {
    const resp = await axios.get(url, { timeout: 60000 });
    console.log('API response status:', resp.status);
    const items = resp.data?.item || [];
    console.log('Number of Senate members fetched from API:', items.length);

    if (items.length > 0) {
      console.log('Sample API members (first 3):', 
        items.slice(0, 3).map(m => ({
          bioguideId: m.bioguideId,
          name: m.name,
          state: m.state,
          partyName: m.partyName
        }))
      );
    }

    return items;
  } catch (err) {
    console.error('API fetch failed:', err.message);
    return [];
  }
}

// Normalize name for matching (handles "Last, First" vs "First Last")
function normalizeName(name) {
  return name.toLowerCase()
    .replace(/,/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function baseRecord(sen) {
  const lastTerm = sen.terms.at(-1);
  return {
    bioguideId: sen.id.bioguide,
    name: `${sen.name.first} ${sen.name.last}`,
    state: lastTerm.state,
    district: 'At-Large',
    party: lastTerm.party,
    office: 'Senator',
    congressgovId: null,
    // Votes
    yeaVotes: 0,
    nayVotes: 0,
    missedVotes: 0,
    totalVotes: 0,
    participationPct: 0,
    missedVotePct: 0,
    // Legislation
    sponsoredBills: 0,
    cosponsoredBills: 0,
    sponsoredAmendments: 0,
    cosponsoredAmendments: 0,
    becameLawBills: 0,
    becameLawCosponsoredBills: 0,
    // Committees
    committees: [],
    // Scores
    rawScore: 0,
    score: 0,
    scoreNormalized: 0
  };
}

(async () => {
  // Load local roster
  const roster = JSON.parse(fs.readFileSync(ROSTER_PATH, 'utf-8'));
  
  // Filter current Senators (term end in future)
  const sens = roster.filter(r => {
    const t = r.terms.at(-1);
    return t.type === 'sen' && new Date(t.end) > new Date();
  }).map(baseRecord);

  console.log(`Found ${sens.length} current Senators in local roster`);

  // Fetch authoritative Senate data from Congress.gov
  const apiSenators = await fetchSenateMembers();

  // Enrich with congressgovId (bioguideId)
  let matched = 0;
  for (const sen of sens) {
    const senLastName = sen.name.split(' ').pop().toLowerCase();
    const senNorm = normalizeName(sen.name);
    const senState = sen.state;

    const match = apiSenators.find(api => {
      const apiNorm = normalizeName(api.name);
      return (apiNorm.includes(senLastName) || senNorm.includes(senLastName)) &&
             api.state === senState;
    });

    if (match) {
      sen.congressgovId = match.bioguideId;
      matched++;
      console.log(`SUCCESS: Matched ${sen.name} (${sen.state}) → congressgovId: ${sen.congressgovId}`);
    } else {
      console.log(`NO MATCH for ${sen.name} (${sen.state})`);
    }
  }

  console.log(`Final stats: ${matched} out of ${sens.length} Senators matched with congressgovId`);

  fs.writeFileSync(OUT_PATH, JSON.stringify(sens, null, 2));
  console.log(`Bootstrapped senators-rankings.json with ${sens.length} current Senators`);
})();
