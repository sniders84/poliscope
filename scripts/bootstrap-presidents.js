// scripts/bootstrap-presidents.js
// Build presidents-rankings.json using the unified hybrid schema (cleaned, no placeholders)
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const ROSTER_PATH = path.join(ROOT, "public", "presidents.json");
const RANKINGS_PATH = path.join(ROOT, "public", "presidents-rankings.json");

// Clean category initializer (no placeholders)
function emptyCategory() {
  return {
    overview: "",
    majorEvents: [],
    minorEvents: [],
    subcategories: {}
  };
}

function main() {
  const raw = fs.readFileSync(ROSTER_PATH, "utf8");
  const presidents = JSON.parse(raw);

  // Output MUST be an ARRAY
  const rankings = presidents.map(p => ({
    id: p.presidentNumber,
    name: p.name,
    party: p.party,
    termStart: p.termStart,
    termEnd: p.termEnd,
    photo: p.photo || null,
    slug: p.slug || null,
    office: "President",
    // Hybrid categories (empty baseline, no placeholders)
    crisisManagement: emptyCategory(),
    domesticPolicy: emptyCategory(),
    economicPolicy: emptyCategory(),
    foreignPolicy: emptyCategory(),
    judicialPolicy: emptyCategory(),
    legislation: emptyCategory(),
    misconduct: emptyCategory(),
    // Scoring containers
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
    powerScore: 0,
    summaries: {
      crisisManagement: "",
      domesticPolicy: "",
      economicPolicy: "",
      foreignPolicy: "",
      judicialPolicy: "",
      legislation: "",
      misconduct: ""
    }
  }));

  fs.writeFileSync(RANKINGS_PATH, JSON.stringify(rankings, null, 2));
  console.log(`bootstrap-presidents: wrote ${rankings.length} clean records (no placeholders)`);
}
main();
