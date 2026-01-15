const fs = require('fs');
const path = require('path');

const REPS_PATH = path.join(__dirname, '../public/representatives-rankings.json');
const COMMITTEES_PATH = path.join(__dirname, '../public/house-committees-current.json');

function updateCommittees() {
  const reps = JSON.parse(fs.readFileSync(REPS_PATH, 'utf8'));
  const committees = JSON.parse(fs.readFileSync(COMMITTEES_PATH, 'utf8'));

  // Normalize committees into an array
  const committeeArray = Array.isArray(committees)
    ? committees
    : Object.entries(committees).map(([code, data]) => ({
        code,
        name: data.name,
        members: data.members || []
      }));

  const committeeLookup = {};
  committeeArray.forEach(c => {
    c.members.forEach(m => {
      if (!m.bioguideId) return;
      if (!committeeLookup[m.bioguideId]) committeeLookup[m.bioguideId] = [];
      committeeLookup[m.bioguideId].push({
        committee: c.code,
        committeeName: c.name,
        role: m.role || 'Member',
        rank: m.rank || null,
        party: m.party || null
      });
    });
  });

  reps.forEach(rep => {
    rep.committees = committeeLookup[rep.bioguideId] || [];
  });

  fs.writeFileSync(REPS_PATH, JSON.stringify(reps, null, 2));
  console.log(`Updated committees for ${reps.length} representatives`);
}

updateCommittees();
