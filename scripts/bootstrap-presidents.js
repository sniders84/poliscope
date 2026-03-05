// scripts/bootstrap-presidents.js
// Builds presidents-rankings.json with streamlined structure: single events array per president (deduplicated, tagged, scorable only where impactful).
// No redundant category silos or subcategories—events handle all via tags.
// Initializes with empty events; population happens in later merge/populate scripts.
// This cuts bloat by ~70-80% per entry, focusing on unique, material-impact events for scoring.

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const ROSTER_PATH = path.join(ROOT, "public", "presidents.json");
const RANKINGS_PATH = path.join(ROOT, "public", "presidents-rankings.json");

function main() {
  const raw = fs.readFileSync(ROSTER_PATH, "utf8");
  const presidents = JSON.parse(raw);

  // Output MUST be an ARRAY of president objects
  const rankings = presidents.map(p => ({
    id: p.presidentNumber,
    name: p.name,
    party: p.party,
    termStart: p.termStart,
    termEnd: p.termEnd,
    photo: p.photo || null,
    slug: p.slug || null,
    office: "President",
    // Short overview (populate later if needed)
    presidencyOverview: "",
    // Unified events array: all crises, policies, etc., here (deduped by title/year in later steps)
    events: [],  // Each event: {title, year, summary, tags: [], sources: [], severity?, effectiveness?, notes?}
    // Scoring containers (derive from events later)
    categoryScores: {
      crisisManagement: 0,
      domesticPolicy: 0,
      economicPolicy: 0,
      foreignPolicy: 0,
      judicialPolicy: 0,
      legislation: 0,
      misconduct: 0
    },
    eraNormalizedScore: 0,
    overallPowerScore: 0,  // Renamed from powerScore for clarity; compute as avg/weighted from events
    lastUpdated: new Date().toISOString()
  }));

  fs.writeFileSync(RANKINGS_PATH, JSON.stringify(rankings, null, 2));
  console.log(`bootstrap-presidents: wrote ${rankings.length} streamlined records (single events array, no category bloat)`);
}

main();
