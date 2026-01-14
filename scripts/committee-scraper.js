/**
 * Committee scraper (local JSON version)
 * - Reads public/senators-committee-membership-current.json
 * - Aggregates committee memberships per senator
 * - Captures leadership flags (Chair, Ranking Member)
 * - Outputs public/senators-committees.json
 */

const fs = require('fs');
const path = require('path');

const INPUT = path.join('public', 'senators-committee-membership-current.json');
const OUTPUT = path.join('public', 'senators-committees.json');

function run() {
  if (!fs.existsSync(INPUT)) {
    throw new Error(`Missing ${INPUT}. Make sure the committee membership file is present.`);
  }

  const raw = fs.readFileSync(INPUT, 'utf8');
  const committees = JSON.parse(raw);

  // Map bioguideId -> committees[]
  const totals = new Map();

  for (const [committeeId, committee] of Object.entries(committees)) {
    const name = committee?.name || committeeId;
    const members = committee?.members || [];

    for (const m of members) {
      const bioguideId = m?.bioguideId;
      if (!bioguideId) continue;

      if (!totals.has(bioguideId)) totals.set(bioguideId, []);

      totals.get(bioguideId).push({
        committee: name,
        role: m?.rank === 'Chairman' ? 'Chair' :
              m?.rank === 'Ranking Member' ? 'Ranking Member' :
              'Member'
      });
    }
  }

  const results = Array.from(totals.entries()).map(([bioguideId, committees]) => ({
    bioguideId,
    committees
  }));

  fs.writeFileSync(OUTPUT, JSON.stringify(results, null, 2));
  console.log(`Wrote ${OUTPUT} with ${results.length} senator entries.`);
}

run();
