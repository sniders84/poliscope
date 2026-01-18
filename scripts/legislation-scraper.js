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

async function fetchMembers(congress = 119) {
  let url = `https://api.congress.gov/v3/member/congress/${congress}?limit=250&api_key=${API_KEY}`;
  let all = [];

  while (url) {
    const resp = await axios.get(url, { timeout: 60000 });
    all = all.concat(resp.data.members);

    // The API’s pagination.next does not include your api_key — add it back
    if (resp.data.pagination && resp.data.pagination.next) {
      const nextUrl = resp.data.pagination.next;
      url = `${nextUrl}&api_key=${API_KEY}`;
    } else {
      url = null;
    }
  }
  return all;
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
  const roster = JSON.parse(fs.readFileSync(ROSTER_PATH, 'utf-8'));
  const sens = roster.filter(r => {
    const t = r.terms.at(-1);
    return t.type === 'sen' && new Date(t.end) > new Date();
  }).map(baseRecord);

  const members = await fetchMembers(119);
  const map = {};
  for (const m of members) {
    if (m.bioguideId) {
      map[m.bioguideId] = m.memberId;
    }
  }

  for (const sen of sens) {
    if (map[sen.bioguideId]) {
      sen.congressgovId = map[sen.bioguideId];
    }
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(sens, null, 2));
  console.log(`Bootstrapped senators-rankings.json with ${sens.length} current Senators (with congressgovId)`);
})();
