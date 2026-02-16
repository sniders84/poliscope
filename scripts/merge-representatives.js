// merge-representatives.js
// Purpose: Enrich representatives-rankings.json with data from all scrapers

const fs = require("fs");
const path = require("path");

function loadJSON(relativePath, defaultValue = {}) {
  const fullPath = path.join(__dirname, relativePath);
  try {
    const content = fs.readFileSync(fullPath, "utf8");
    return JSON.parse(content);
  } catch (err) {
    console.error(`Failed to load ${relativePath}: ${err.message}`);
    return defaultValue;
  }
}

function writeJSON(relativePath, data) {
  const fullPath = path.join(__dirname, relativePath);
  fs.writeFileSync(fullPath, JSON.stringify(data, null, 2), "utf8");
  console.log(`Wrote/updated: ${relativePath}`);
}

// ── Load base rankings (this is the file we will enrich and overwrite) ───────
let rankings = loadJSON("../public/representatives-rankings.json", []) || [];

// ── Load all intermediate files ────────────────────────────────────────────────
const committees   = loadJSON("../public/representatives-committees.json", {}) || {};
const votes        = loadJSON("../public/representatives-votes.json", [])      || [];
const legislation  = loadJSON("../public/representatives-legislation.json", [])|| [];

// Note: misconduct is applied later by misconduct-scraper.js (already done before this script in some workflows)
//       scores and streaks are applied after this merge

// ── Build lookups by bioguideId ────────────────────────────────────────────────
const votesById = new Map(votes.map(v => [v.bioguideId || v.bioguide, v.votes || {}]));

const legById = new Map(legislation.map(l => [l.bioguideId || l.bioguide, l]));

const committeesById = new Map();

for (const [slug, members] of Object.entries(committees)) {
  if (!Array.isArray(members)) continue;

  for (const m of members) {
    const id = m.bioguide;
    if (!id) continue;

    if (!committeesById.has(id)) committeesById.set(id, []);

    const entry = {
      slug,
      title: m.title || null,
      rank: m.rank || null,
      party: m.party || null,
      name: m.name || null
    };

    // Dedupe
    const existing = committeesById.get(id);
    const isDup = existing.some(c => c.slug === entry.slug && c.title === entry.title && c.rank === entry.rank);
    if (!isDup) existing.push(entry);
  }
}

// ── Enrich each ranking entry ──────────────────────────────────────────────────
const enriched = rankings.map(entry => {
  const id = entry.bioguideId || entry.bioguide || null;
  if (!id) return entry;

  const voteStats     = votesById.get(id)    || {};
  const legStats      = legById.get(id)      || {};
  const committeeList = committeesById.get(id) || [];

  // Photo fallback (if missing or empty)
  let photo = entry.photo;
  if (!photo && id) {
    photo = `https://www.congress.gov/img/member/${id.toLowerCase()}_200.jpg`;
  }

  return {
    ...entry,
    ...voteStats,           // yeaVotes, nayVotes, missedVotes, totalVotes, participationPct, missedVotePct
    ...legStats,            // sponsoredBills, cosponsoredBills, becameLawBills, etc.
    committees: committeeList,
    photo
  };
});

// ── Overwrite the original rankings file with the enriched version ─────────────
writeJSON("../public/representatives-rankings.json", enriched);

console.log(`Enriched and overwrote representatives-rankings.json with ${enriched.length} representatives`);
console.log(`Reps with vote data: ${Object.keys(voteStats).length}`);
console.log(`Reps with legislation data: ${Object.keys(legStats).length}`);
console.log(`Reps with committees: ${committeesById.size}`);
