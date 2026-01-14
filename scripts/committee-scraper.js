/**
 * Committee scraper (from local JSON)
 * - Reads public/senators-committee-membership-current.json
 * - Maps committees to the correct senator by bioguide
 * - Dedupes per senator; filters to top-level Senate committees
 * - Preserves leadership flags (Chair, Ranking Member)
 * - Outputs public/senators-committees.json
 */

const fs = require('fs');
const path = require('path');

const INPUT = path.join('public', 'senators-committee-membership-current.json');
const OUTPUT = path.join('public', 'senators-committees.json');

// Known top-level Senate committee codes (exclude subcommittees)
const SENATE_TOP_LEVEL = new Set([
  'SSAF','SSAP','SSAS','SSBK','SSBU','SSCM','SSCS','SSFI','SSFR','SSGA',
  'SSHR','SSIA','SSJU','SSSB','SSSH','SSVA','SSWO','SSAG','SSEN','SSHO',
  'SSIN','SSLG','SSRU','SSSC','SSSM','SSTR'
]);

function normalizeRole(title) {
  if (!title) return 'Member';
  const t = title.toLowerCase();
  if (t.includes('chair')) return 'Chair';
  if (t.includes('ranking')) return 'Ranking Member';
  return 'Member';
}

function run() {
  if (!fs.existsSync(INPUT)) throw new Error(`Missing ${INPUT}`);
  const committees = JSON.parse(fs.readFileSync(INPUT, 'utf8'));

  // bioguideId => Map<committeeCode, role>
  const perSenator = new Map();

  for (const [committeeCode, members] of Object.entries(committees)) {
    // Only include top-level Senate committees
    if (!SENATE_TOP_LEVEL.has(committeeCode)) continue;
    if (!Array.isArray(members)) continue;

    for (const m of members) {
      const id = m?.bioguide;
      if (!id) continue;

      if (!perSenator.has(id)) perSenator.set(id, new Map());

      const role = normalizeRole(m?.title);
      // Dedupe: keep highest role if multiple entries exist
      const existing = perSenator.get(id).get(committeeCode);
      const rankOrder = { 'Chair': 3, 'Ranking Member': 2, 'Member': 1 };
      if (!existing || rankOrder[role] > rankOrder[existing]) {
        perSenator.get(id).set(committeeCode, role);
      }
    }
  }

  const results = Array.from(perSenator.entries()).map(([bioguideId, cmap]) => ({
    bioguideId,
    committees: Array.from(cmap.entries()).map(([committee, role]) => ({ committee, role }))
  }));

  if (results.length === 0) {
    console.log('No data found, skipping write to avoid wiping existing file.');
    process.exit(0);
  }

  fs.writeFileSync(OUTPUT, JSON.stringify(results, null, 2));
  console.log(`Wrote ${OUTPUT} with ${results.length} senator entries.`);
}

run();
