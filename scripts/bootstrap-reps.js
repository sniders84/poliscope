// scripts/bootstrap-reps.js
// Purpose: Generate baseline representatives-rankings.json from Clerk roster

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const { XMLParser } = require('fast-xml-parser');

const OUT_PATH = path.join(__dirname, '..', 'public', 'representatives-rankings.json');
const ROSTER_URL = 'https://clerk.house.gov/xml/lists/memberdata.xml';

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '', trimValues: true });

(async () => {
  const res = await fetch(ROSTER_URL);
  const xml = await res.text();
  const doc = parser.parse(xml);

  // Correct root element is "member-data"
  const members = doc['member-data']?.member || [];

  const reps = members.map(m => ({
    bioguideId: m.bioguideID,
    name: m['official-name'] || `${m['first-name']} ${m['last-name']}`,
    state: m.state,
    district: m.district,
    party: m.party,
    yeaVotes: 0,
    nayVotes: 0,
    missedVotes: 0,
    totalVotes: 0,
    participationPct: 0,
    missedVotePct: 0,
    sponsoredBills: 0,
    cosponsoredBills: 0,
    sponsoredAmendments: 0,
    cosponsoredAmendments: 0,
    becameLawBills: 0,
    becameLawAmendments: 0,
    becameLawCosponsoredAmendments: 0,
    committees: []
  }));

  fs.writeFileSync(OUT_PATH, JSON.stringify(reps, null, 2));
  console.log(`Bootstrapped representatives-rankings.json with ${reps.length} current House members`);
})();
