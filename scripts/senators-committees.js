const fs = require('fs');
const path = require('path');

const RANKINGS_PATH = path.join(__dirname, '../public/senators-rankings.json');
const LEGISLATORS_PATH = path.join(__dirname, '../public/legislators-current.json');
const OUTPUT_PATH = path.join(__dirname, '../public/senators-committees.json');

function main() {
  const baseSenators = JSON.parse(fs.readFileSync(RANKINGS_PATH, 'utf8'));
  const legislators = JSON.parse(fs.readFileSync(LEGISLATORS_PATH, 'utf8'));

  // Map bioguideId -> committees
  const bioguideToCommittees = {};

  legislators.forEach(leg => {
    const currentTerm = leg.terms?.[leg.terms.length - 1];
    if (currentTerm?.type === 'sen') {
      const bioguide = leg.id?.bioguide;
      if (bioguide) {
        bioguideToCommittees[bioguide] = leg.committees || [];
      }
    }
  });

  // Build output matching your base senators
  const output = baseSenators.map(sen => {
    const committees = bioguideToCommittees[sen.bioguideId] || [];
    return {
      name: sen.name,
      bioguideId: sen.bioguideId,
      committees: committees.map(c => ({
        committee: c.name,
        role: c.role || 'Member',
        subcommittees: c.subcommittees?.map(sub => ({
          subcommittee: sub.name,
          role: sub.role || 'Member'
        })) || []
      }))
    };
  });

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
  console.log(`Generated committees for ${output.length} senators`);
  console.log('senators-committees.json updated!');
}

main();
