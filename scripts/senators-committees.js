const fs = require('fs');
const path = require('path');

const RANKINGS_PATH = path.join(__dirname, '../public/senators-rankings.json');
const LEGISLATORS_PATH = path.join(__dirname, '../public/legislators-current.json');
const OUTPUT_PATH = path.join(__dirname, '../public/senators-committees.json');

function main() {
  let baseSenators;
  let legislators;

  try {
    baseSenators = JSON.parse(fs.readFileSync(RANKINGS_PATH, 'utf8'));
    legislators = JSON.parse(fs.readFileSync(LEGISLATORS_PATH, 'utf8'));
  } catch (err) {
    console.error('Error loading JSON files:', err.message);
    process.exit(1);
  }

  // Build map: bioguideId → committees array
  const bioguideToCommittees = {};

  legislators.forEach(leg => {
    const currentTerm = leg.terms?.[leg.terms.length - 1];
    if (currentTerm?.type === 'sen') {
      const bioguide = leg.id?.bioguide;
      if (bioguide && leg.committees?.length > 0) {
        bioguideToCommittees[bioguide] = leg.committees.map(c => ({
          committee: c.name,
          role: c.role || 'Member',
          subcommittees: (c.subcommittees || []).map(sub => ({
            subcommittee: sub.name,
            role: sub.role || 'Member'
          }))
        }));
      }
    }
  });

  // Build output for your base senators
  const output = baseSenators.map(sen => {
    const committees = bioguideToCommittees[sen.bioguideId] || [];
    return {
      name: sen.name,
      bioguideId: sen.bioguideId,
      committees
    };
  });

  try {
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
    console.log(`Generated committees for ${output.length} senators`);
    console.log('senators-committees.json updated!');
  } catch (err) {
    console.error('Error writing output:', err.message);
  }
}

main();
