// committee-scraper.js
// Fetches committee membership JSON from congress-legislators repo
// Outputs public/senators-committees.json

const fs = require('fs');
const fetch = require('node-fetch');

const legislators = JSON.parse(fs.readFileSync('public/legislators-current.json', 'utf8'));
const senators = legislators.filter(l => l.terms.some(t => t.type === 'sen'));
const byBioguide = new Map(senators.map(s => [s.id.bioguide, s]));

const COMMITTEE_URL = 'https://unitedstates.github.io/congress-legislators/committee-membership-current.json';

async function run() {
  console.log('Fetching committee membership JSON...');
  const res = await fetch(COMMITTEE_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${COMMITTEE_URL}`);
  const committees = await res.json();

  const senatorCommittees = new Map();

  for (const [committeeCode, committeeData] of Object.entries(committees)) {
    if (committeeData.chamber !== 'Senate') continue;
    const committeeName = committeeData.name;
    const members = committeeData.members || [];

    for (const member of members) {
      const bioguideId = member.bioguide;
      if (!bioguideId) continue;

      if (byBioguide.has(bioguideId)) {
        if (!senatorCommittees.has(bioguideId)) {
          senatorCommittees.set(bioguideId, { committees: [], committeeLeadership: [] });
        }
        const entry = senatorCommittees.get(bioguideId);
        entry.committees.push(committeeName);

        if (member.role && /Chair|Ranking Member/i.test(member.role)) {
          entry.committeeLeadership.push(`${member.role}: ${committeeName}`);
        }
      }
    }
  }

  const results = [];
  for (const [bioguideId, data] of senatorCommittees.entries()) {
    results.push({ bioguideId, ...data });
  }

  fs.writeFileSync('public/senators-committees.json', JSON.stringify(results, null, 2));
  console.log('Committee scraper complete!');
}

run().catch(err => console.error(err));
