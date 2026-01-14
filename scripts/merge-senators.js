/**
 * Merge script
 * - Combines legislation, committees, votes
 * - Outputs public/senators-rankings.json
 */

const fs = require('fs');
const path = require('path');

const OUT_PATH = path.join('public', 'senators-rankings.json');

function load(file) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
}

function run() {
  const legislation = load(path.join('public', 'senators-legislation.json'));
  const committees = load(path.join('public', 'senators-committees.json'));
  const votes = load(path.join('public', 'senators-votes.json'));

  const byId = new Map();

  for (const l of legislation) byId.set(l.bioguideId, { bioguideId: l.bioguideId, ...l });
  for (const c of committees) {
    if (!byId.has(c.bioguideId)) byId.set(c.bioguideId, { bioguideId: c.bioguideId });
    byId.get(c.bioguideId).committees = c.committees;
  }
  for (const v of votes) {
    if (!byId.has(v.bioguideId)) byId.set(v.bioguideId, { bioguideId: v.bioguideId });
    Object.assign(byId.get(v.bioguideId), v);
  }

  const results = Array.from(byId.values());
  fs.writeFileSync(OUT_PATH, JSON.stringify(results, null, 2));
  console.log(`Wrote ${OUT_PATH} with ${results.length} senator entries.`);
}

run();
