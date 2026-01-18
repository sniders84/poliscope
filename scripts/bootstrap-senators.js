// Purpose: Generate baseline senators-rankings.json from local legislators-current.json
// Filters for current Senators, initializes full schema, and enriches with Congress.gov memberId

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

const roster = JSON.parse(fs.readFileSync(ROSTER_PATH, 'utf-8'));

async function resolveCongressGovId(bioguideId) {
  try {
    const url = `https://api.congress.gov/v3/member?bioguideId=${bioguideId}&api_key=${API_KEY}`;
    const resp = await axios.get(url, { timeout: 60000 });
    if (resp.data.members && resp.data.members.length > 0) {
      return resp.data.members[0].memberId;
    }
    return null;
  } catch (err) {
    console.error(`Failed to resolve congressgovId for ${bioguideId}: ${err.message}`);
    return null;
  }
}

async function baseRecord(sen) {
  const lastTerm = sen.terms.at(-1);
  const record = {
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

  record.congressgovId = await resolveCongressGovId(record.bioguideId);
  return record;
}

(async () => {
  const sens = [];
  for (const r of roster) {
    const t = r.terms.at(-1);
    if (t.type === 'sen' && new Date(t.end) > new Date()) {
      sens.push(await baseRecord(r));
    }
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(sens, null, 2));
  console.log(`Bootstrapped senators-rankings.json with ${sens.length} current Senators (with congressgovId)`);
})();
