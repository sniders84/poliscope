const fs = require('fs');
const path = require('path');

const REPS_PATH = path.join(__dirname, '../public/representatives-rankings.json');
const COMMITTEES_PATH = path.join(__dirname, '../public/house-committees-current.json');

function run() {
  const reps = JSON.parse(fs.readFileSync(REPS_PATH, 'utf8'));
  const committees = JSON.parse(fs.readFileSync(COMMITTEES_PATH, 'utf8'));

  const committeeArray = Array.isArray(committees)
    ? committees
    : Object.entries(committees).map(([code, data]) => ({
        code,
        name: data.name,
        members: data.members || []
      }));

  const lookup = {};
  committeeArray.forEach(c => {
    c.members.forEach(m => {
      if (!m.bioguideId) return;
      if (!lookup[m.bioguideId]) lookup[m.bioguideId] = [];
      lookup[m.bioguideId].push({
        committee: c.code,
        committeeName: c.name,
        role: m.role || 'Member',
        rank: m.rank || null,
        party: m.party || null
      });
    });
  });

  reps.forEach(rep => {
    rep.committees = lookup[rep.bioguideId] || [];
    rep.office = rep.office || `${rep.state} Representative`;
  });

  fs.writeFileSync(REPS_PATH, JSON.stringify(reps, null, 2));
  console.log(`Updated committees for ${reps.length} representatives`);
}

run();
