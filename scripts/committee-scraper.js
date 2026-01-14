/**
 * Committee scraper
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
    throw new Error(`Missing ${INPUT}`);
  }

  const committees = JSON.parse(fs.readFileSync(INPUT, 'utf8'));
  const totals = new Map();

  for (const [cid, committee] of Object.entries(committees)) {
    const name = committee?.name || cid;
    const members = committee?.members || [];

    for (const m of members) {
      const id = m?.bioguideId;
      if (!id) continue;

      if (!totals.has(id)) totals.set(id, []);

      let role = 'Member';
      if (m?.rank === 'Chairman') role = 'Chair';
      else if (m?.rank === 'Ranking Member') role = 'Ranking Member';

      totals.get(id).push({
        committee: name,
        role
      });
    }
  }

  const results = Array.from(totals.entries()).map(([id, committees]) => ({
    bioguideId: id,
    committees
  }));

  fs.writeFileSync(OUTPUT, JSON.stringify(results, null, 2));
  console.log(`Wrote ${OUTPUT} with ${results.length} senator entries.`);
}

run();
