const fs = require('fs');
const path = require('path');

const rankingsPath = path.join(__dirname, '../public/senators-rankings.json');
const bills = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/senate-legislation.json'))).bills || [];
const votes = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/senate-votes.json'))).votes || [];
const rankings = JSON.parse(fs.readFileSync(rankingsPath));

const bySponsor = new Map();
for (const b of bills) {
  const sponsorId = b.sponsor?.bioguideId || b.sponsor?.bioguide_id || null;
  if (!sponsorId) continue;
  if (!bySponsor.has(sponsorId)) bySponsor.set(sponsorId, []);
  bySponsor.get(sponsorId).push(b);
}

const votesByMember = new Map();
for (const v of votes) {
  const memberId = v.member?.bioguideId || v.member?.bioguide_id || null;
  if (!memberId) continue;
  if (!votesByMember.has(memberId)) votesByMember.set(memberId, []);
  votesByMember.get(memberId).push(v);
}

for (const sen of rankings) {
  const id = sen.bioguideId || sen.bioguide_id;
  sen.legislation = bySponsor.get(id) || [];
  sen.votes = votesByMember.get(id) || [];
}

fs.writeFileSync(rankingsPath, JSON.stringify(rankings, null, 2));
console.log('Merged Senate legislation and votes into senators-rankings.json');
