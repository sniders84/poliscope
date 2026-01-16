// scripts/merge-reps.js
// Purpose: Consolidate all House data into representatives-rankings.json
// Sources: reps-legislation.json, reps-committees.json, reps-votes.json

const fs = require('fs');
const path = require('path');

const OUT_PATH = path.join(__dirname, '..', 'public', 'representatives-rankings.json');
const LEGIS_PATH = path.join(__dirname, '..', 'public', 'reps-legislation.json');
const COMM_PATH = path.join(__dirname, '..', 'public', 'reps-committees.json');
const VOTES_PATH = path.join(__dirname, '..', 'public', 'reps-votes.json');

(function main() {
  let rankings = [];

  try {
    rankings = JSON.parse(fs.readFileSync(LEGIS_PATH, 'utf-8'));
  } catch {
    console.error('Failed to load reps-legislation.json');
    return;
  }

  // Attach committees
  try {
    const committees = JSON.parse(fs.readFileSync(COMM_PATH, 'utf-8'));
    for (const rep of rankings) {
      if (committees[rep.bioguideId]) {
        rep.committees = committees[rep.bioguideId];
      }
    }
  } catch {
    console.warn('No committees file found, skipping');
  }

  // Attach votes
  try {
    const votes = JSON.parse(fs.readFileSync(VOTES_PATH, 'utf-8'));
    for (const rep of rankings) {
      if (votes[rep.bioguideId]) {
        Object.assign(rep, votes[rep.bioguideId]);
      }
    }
  } catch {
    console.warn('No votes file found, skipping');
  }

  // Deduplicate by bioguideId
  const seen = new Set();
  rankings = rankings.filter(r => {
    if (seen.has(r.bioguideId)) return false;
    seen.add(r.bioguideId);
    return true;
  });

  fs.writeFileSync(OUT_PATH, JSON.stringify(rankings, null, 2));
  console.log(`Merge complete: ${rankings.length} representatives written to representatives-rankings.json`);
})();
