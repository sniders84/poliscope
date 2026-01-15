const fs = require('fs');
const path = require('path');

const LEGISLATORS_PATH = path.join(__dirname, '../public/legislators-current.json');
const OUTPUT_PATH = path.join(__dirname, '../public/representatives-rankings.json');

function buildReps() {
  let legislators;
  try {
    legislators = JSON.parse(fs.readFileSync(LEGISLATORS_PATH, 'utf8'));
  } catch (err) {
    console.error('Failed to load legislators-current.json:', err.message);
    return;
  }

  const reps = legislators
    .filter(l => {
      const lastTerm = l.terms[l.terms.length - 1];
      return lastTerm.type === 'rep';
    })
    .map(l => {
      const lastTerm = l.terms[l.terms.length - 1];
      return {
        name: l.name.official_full,
        bioguideId: l.id.bioguide,
        state: lastTerm.state,
        party: lastTerm.party[0].toUpperCase(), // D/R/I
        sponsoredBills: 0,
        cosponsoredBills: 0,
        sponsoredAmendments: 0,
        cosponsoredAmendments: 0,
        yeaVotes: 0,
        nayVotes: 0,
        missedVotes: 0,
        totalVotes: 0
      };
    });

  try {
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(reps, null, 2));
    console.log(`Wrote ${reps.length} representatives to representatives-rankings.json`);
  } catch (err) {
    console.error('Failed to write representatives-rankings.json:', err.message);
  }
}

buildReps();
