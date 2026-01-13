const fs = require('fs');

async function generateCommittees() {
  // Load your base senators for bioguideIds
  const base = JSON.parse(fs.readFileSync('public/senators-rankings.json', 'utf8'));

  // Load the full legislators JSON (put this file in your repo or fetch from URL)
  const legislators = JSON.parse(fs.readFileSync('data/legislators-current.json', 'utf8')); // adjust path if needed

  const bioguideToCommittees = {};

  legislators.forEach(leg => {
    if (leg.terms && leg.terms[leg.terms.length - 1].type === 'sen') { // Current senator
      const bioguide = leg.id.bioguide;
      if (bioguide) {
        bioguideToCommittees[bioguide] = leg.committees || [];
      }
    }
  });

  const output = base.map(sen => {
    const committees = bioguideToCommittees[sen.bioguideId] || [];
    return {
      name: sen.name,
      bioguideId: sen.bioguideId,
      committees: committees.map(c => ({
        committee: c.name,
        role: c.role || 'Member',
        subcommittees: c.subcommittees || [] // if subs are present
      }))
    };
  });

  fs.writeFileSync('public/senators-committees.json', JSON.stringify(output, null, 2));
  console.log(`Generated committees for ${output.length} senators`);
}

generateCommittees();
