// committee-scraper.js
// Reads committee-membership-current.json from public/
// Outputs public/senators-committee-membership-current.json

const fs = require('fs');

// Legislators metadata
const legislators = JSON.parse(fs.readFileSync('public/legislators-current.json', 'utf8'));
const senators = legislators.filter(l => l.terms.some(t => t.type === 'sen'));
const byBioguide = new Map(senators.map(s => [s.id.bioguide, s]));

// Source file (you download this nightly into public/)
const committees = JSON.parse(fs.readFileSync('public/committee-membership-current.json', 'utf8'));

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

const results = Array.from(senatorCommittees.entries()).map(([bioguideId, data]) => ({
  bioguideId,
  committees: data.committees,
  committeeLeadership: data.committeeLeadership,
}));

fs.writeFileSync('public/senators-committee-membership-current.json', JSON.stringify(results, null, 2));
console.log('Committee scraper complete! Wrote public/senators-committee-membership-current.json');
