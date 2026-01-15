const fs = require('fs');
const path = require('path');

const REPS_PATH = path.join(__dirname, '../public/representatives-rankings.json');
const COMMITTEES_PATH = path.join(__dirname, '../public/house-committees-current.json'); 
// adjust if your committee source file has a different name

function updateCommittees() {
  let reps, committees;
  try {
    reps = JSON.parse(fs.readFileSync(REPS_PATH, 'utf8'));
    committees = JSON.parse(fs.readFileSync(COMMITTEES_PATH, 'utf8'));
  } catch (err) {
    console.error('Failed to load input files:', err.message);
    process.exit(1);
  }

  // Build lookup keyed by bioguideId
  const committeeLookup = {};
  committees.forEach(c => {
    (c.members || []).forEach(m => {
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

  // Attach all committees to each rep
  reps.forEach(rep => {
    rep.committees = committeeLookup[rep.bioguideId] || [];
  });

  fs.writeFileSync(REPS_PATH, JSON.stringify(reps, null, 2));
  console.log(`Updated committees for ${reps.length} representatives`);
}

updateCommittees();
