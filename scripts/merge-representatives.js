// merge-representatives.js
// Enriches and overwrites representatives-rankings.json with all scraper data,
// including House committees from representatives-committees.json (HSxx only).

const fs = require("fs");
const path = require("path");

function loadJSON(relativePath, defaultValue = {}) {
  const fullPath = path.join(__dirname, relativePath);
  try {
    return JSON.parse(fs.readFileSync(fullPath, "utf8"));
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

// ------------------------------------------------------------
// LOAD BASE FILES
// ------------------------------------------------------------

let rankings = loadJSON("../public/representatives-rankings.json", []) || [];

const votes        = loadJSON("../public/representatives-votes.json", []) || [];
const legislation  = loadJSON("../public/legislation-representatives.json", []) || [];
const committeeRaw = loadJSON("../public/representatives-committees.json", {}) || {};

// ------------------------------------------------------------
// LOOKUPS
// ------------------------------------------------------------

// votes scraper now outputs FLAT fields (yeaVotes, nayVotes, etc.)
const votesById = new Map(
  votes.map(v => [v.bioguideId || v.bioguide, v])
);

const legById = new Map(
  legislation.map(l => [l.bioguideId || l.bioguide, l])
);

// ------------------------------------------------------------
// BUILD committeesById (House only: HSxx codes)
// ------------------------------------------------------------

const committeesById = new Map();

for (const [committeeCode, members] of Object.entries(committeeRaw)) {
  if (!Array.isArray(members)) continue;

  // Only House committees (HSxx)
  if (!committeeCode.startsWith("HS")) continue;

  for (const m of members) {
    const id = (m.bioguide || m.bioguideId || "").toUpperCase();
    const nameKey = (m.name || "").toLowerCase();
    const key = id || nameKey;
    if (!key) continue;

    if (!committeesById.has(key)) committeesById.set(key, []);

    // Normalize role
    let role = m.title || "Member";
    const lower = role.toLowerCase();

    if (m.rank === 1 || lower.includes("chair")) {
      role = "Chair";
    } else if (m.rank === 2 || lower.includes("ranking")) {
      role = "Ranking Member";
    } else if (lower.includes("vice")) {
      role = "Vice Chair";
    } else {
      role = "Member";
    }

    committeesById.get(key).push({
      committeeCode,
      committeeName: committeeCode, // House names not mapped; code is fine
      role,
      rank: m.rank ?? null,
      party: m.party || null
    });
  }
}

// ------------------------------------------------------------
// ENRICH RANKINGS
// ------------------------------------------------------------

const enriched = rankings.map(entry => {
  const id = (entry.bioguideId || entry.bioguide || "").toUpperCase();
  const nameKey = entry.name ? entry.name.toLowerCase() : "";

  const voteStats = votesById.get(id) || {};
  const legStats  = legById.get(id)   || {};

  const committees =
    committeesById.get(id) ||
    committeesById.get(nameKey) ||
    [];

  let photo = entry.photo;
  if (!photo && id) {
    photo = `https://www.congress.gov/img/member/${id.toLowerCase()}_200.jpg`;
  }

  return {
    ...entry,
    ...voteStats,
    ...legStats,
    committees,
    photo
  };
});

// ------------------------------------------------------------
// WRITE OUTPUT
// ------------------------------------------------------------

writeJSON("../public/representatives-rankings.json", enriched);

// Stats
const withVotes = enriched.filter(r => (r.yeaVotes || 0) > 0 || (r.totalVotes || 0) > 0).length;
const withLeg   = enriched.filter(r => (r.sponsoredBills || 0) > 0 || (r.cosponsoredBills || 0) > 0).length;
const withCom   = enriched.filter(r => (r.committees || []).length > 0).length;

console.log(`Enriched and overwrote representatives-rankings.json with ${enriched.length} members`);
console.log(`Members with vote data: ${withVotes}`);
console.log(`Members with legislation data: ${withLeg}`);
console.log(`Members with committees: ${withCom}`);
