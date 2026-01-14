// committee-scraper.js
// Reads senate-committee-membership-current.yaml
// Outputs public/senators-committees.json

const fs = require('fs');
const yaml = require('js-yaml');

// Load legislators metadata
const legislators = JSON.parse(fs.readFileSync('public/legislators-current.json', 'utf8'));
const senators = legislators.filter(l => l.terms.some(t => t.type === 'sen'));
const byBioguide = new Map(senators.map(s => [s.id.bioguide, s]));

// Load committee membership YAML
const committees = yaml.load(
  fs.readFileSync('public/senate-committee-membership-current.yaml', 'utf8')
);

async function run() {
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

        if (member.role && /chair|ranking/i.test(member.role)) {
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
