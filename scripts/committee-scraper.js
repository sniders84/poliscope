// committee-scraper.js
// Fetches Senate committee membership JSON from congress-legislators repo
// Outputs public/senators-committees.json

const fs = require('fs');
const fetch = require('node-fetch');

// Load legislators metadata
const legislators = JSON.parse(fs.readFileSync('public/legislators-current.json', 'utf8'));
const senators = legislators.filter(l => l.terms.some(t => t.type === 'sen'));
const byBioguide = new Map(senators.map(s => [s.id.bioguide, s]));

// Committee membership JSON URL (official repo)
const COMMITTEE_URL = 'https://raw.githubusercontent.com/unitedstates/congress-legislators/master/senate-committee-membership-current.json';

async function getCommittees() {
  console.log('Downloading Senate committee membership JSON...');
  const res = await fetch(COMMITTEE_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${COMMITTEE_URL}`);
  const text = await res.text();
  return JSON.parse(text);
}

async function run() {
  const committees = await getCommittees();

  const senatorCommittees = new Map();

  for (const [committeeCode, committeeData] of Object.entries(committees)) {
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
    results.push({
      bioguideId,
      committees: data.committees,
      committeeLeadership: data.committeeLeadership,
    });
  }

  fs.writeFileSync('public/senators-committees.json', JSON.stringify(results, null, 2));
  console.log('Committee scraper complete!');
}

run().catch(err => console.error(err));
