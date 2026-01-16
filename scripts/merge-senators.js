// scripts/merge-senators.js
// Purpose: Consolidate all Senate data into senators-rankings.json
// Sources: senators-legislation.json, senators-committees.json, senators-votes.json

const fs = require('fs');
const path = require('path');

const OUT_PATH = path.join(__dirname, '..', 'public', 'senators-rankings.json');
const LEGIS_PATH = path.join(__dirname, '..', 'public', 'senators-legislation.json');
const COMM_PATH = path.join(__dirname, '..', 'public', 'senators-committees.json');
const VOTES_PATH = path.join(__dirname, '..', 'public', 'senators-votes.json');

(function main() {
  let rankings = [];

  try {
    rankings = JSON.parse(fs.readFileSync(LEGIS_PATH, 'utf-8'));
  } catch {
    console.error('Failed to load senators-legislation.json');
    return;
  }

  // Attach committees
  try {
    const committees = JSON.parse(fs.readFileSync(COMM_PATH, 'utf-8'));
    for (const sen of rankings) {
      if (committees[sen.bioguideId]) {
        sen.committees = committees[sen.bioguideId];
      }
    }
  } catch {
    console.warn('No committees file found, skipping');
  }

  // Attach votes
  try {
    const votes = JSON.parse(fs.readFileSync(VOTES_PATH, 'utf-8'));
    for (const sen of rankings) {
      if (votes[sen.bioguideId]) {
        Object.assign(sen, votes[sen.bioguideId]);
      }
    }
  } catch {
    console.warn('No votes file found, skipping');
  }

  // Deduplicate by bioguideId
  const seen = new Set();
  rankings = rankings.filter(s => {
    if (seen.has(s.bioguideId)) return false;
    seen.add(s.bioguideId);
    return true;
  });

  fs.writeFileSync(OUT_PATH, JSON.stringify(rankings, null, 2));
  console.log(`Merge complete: ${rankings.length} senators written to senators-rankings.json`);
})();
