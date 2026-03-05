// scripts/bootstrap-presidents.js
// Creates skeleton presidents-rankings.json using the new lean scoring schema
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const ROSTER_PATH = path.join(ROOT, "public", "presidents.json");
const RANKINGS_PATH = path.join(ROOT, "public", "presidents-rankings.json");

console.log("bootstrap-presidents: creating skeleton rankings...");

let roster;
try {
  roster = JSON.parse(fs.readFileSync(ROSTER_PATH, "utf8"));
} catch (err) {
  console.error("Failed to load presidents.json:", err.message);
  process.exit(1);
}

const rankings = roster.map(p => ({
  id: p.presidentNumber || p.id,
  name: p.name,
  party: p.party || "Unknown",
  termStart: p.termStart || "",
  termEnd: p.termEnd || "",
  photo: p.photo || null,
  slug: p.slug || null,
  office: "President",
  rawScore: 0,
  normalizedScore: 0,
  eventTotals: {
    major: 0,
    minor: 0,
    misconduct: 0,
    total: 0
  },
  note: (p.presidentNumber === 9 || p.id === 9) ? "Ranked last due to serving only 31 days in office." : "",
  lastUpdated: new Date().toISOString()
}));

fs.writeFileSync(RANKINGS_PATH, JSON.stringify(rankings, null, 2));
console.log(`bootstrap-presidents: wrote ${rankings.length} skeleton rankings`);
