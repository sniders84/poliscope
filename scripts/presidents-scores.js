// scripts/presidents-scores.js
const fs = require("fs");
const path = require("path");

const rankingsPath = path.join(__dirname, "../public/presidents-rankings.json");
const infoPath = path.join(__dirname, "../public/presidents.json");

console.log("🚀 Running OBJECTIVE + TRANSPARENT scoring engine...");

// Load files
let presidents = JSON.parse(fs.readFileSync(rankingsPath, "utf-8"));
const presInfo = JSON.parse(fs.readFileSync(infoPath, "utf-8"));

// Identity map
const identityMap = new Map();
for (const p of presInfo) {
  const key = p.presidentNumber;
  if (key) identityMap.set(key, { name: p.name, party: p.party, termStart: p.termStart, termEnd: p.termEnd, era: p.era, photo: p.photo, slug: p.slug, office: "President" });
}

// Weights
const CATEGORY_WEIGHTS = {
  crisisManagement: 0.18, domesticPolicy: 0.17, economicPolicy: 0.17,
  foreignPolicy: 0.17, judicialPolicy: 0.12, legislation: 0.12, misconduct: 0.07
};

// Severity engine (tweak these keywords anytime — fully transparent)
function getEventSeverity(title = "", summary = "") {
  const text = (title + " " + summary).toLowerCase();
  if (text.includes("war") || text.includes("depression") || text.includes("civil rights act") ||
      text.includes("voting rights") || text.includes("impeachment") || text.includes("watergate") ||
      text.includes("iran-contra") || text.includes("9/11") || text.includes("great recession")) return 4.0;
  if (text.includes("social security") || text.includes("medicare") || text.includes("medicaid") ||
      text.includes("nafta") || text.includes("tax reform") || text.includes("clean air") ||
      text.includes("affordable care") || text.includes("interstate highway")) return 3.0;
  if (text.includes("treaty") || text.includes("reform") || text.includes("scandal") ||
      text.includes("pardon") || text.includes("drone") || text.includes("intelligence")) return 2.0;
  return 1.0;
}

// Score one category
function scoreCategory(cat, isMisconduct = false) {
  if (!cat) return { score: 0, details: [] };
  const events = cat.events || cat.majorEvents || [];
  let total = 0;
  const details = [];

  events.forEach(e => {
    const severity = getEventSeverity(e.title || "", e.summary || "");
    total += severity;
    details.push({
      event: e.title || "Unnamed event",
      summary: e.summary || "",
      severity: Number(severity.toFixed(1)),
      contribution: isMisconduct ? Number(-severity.toFixed(1)) : Number(severity.toFixed(1))
    });
  });

  const raw = Math.min(10, total);
  const finalScore = isMisconduct ? -raw : raw;

  return { score: Number(finalScore.toFixed(2)), details };
}

// Main engine
presidents = presidents.map(p => {
  const identity = identityMap.get(p.id) || {};
  const categories = {
    crisisManagement: p.crisisManagement,
    domesticPolicy: p.domesticPolicy,
    economicPolicy: p.economicPolicy,
    foreignPolicy: p.foreignPolicy,
    judicialPolicy: p.judicialPolicy,
    legislation: p.legislation,
    misconduct: p.misconduct
  };

  const categoryScores = {};
  const categoryDetails = {};
  let weightedTotal = 0;

  for (const [catName, catData] of Object.entries(categories)) {
    const isMisconduct = catName === "misconduct";
    const result = scoreCategory(catData, isMisconduct);

    categoryScores[catName] = result.score;
    categoryDetails[catName] = result.details;
    weightedTotal += result.score * CATEGORY_WEIGHTS[catName];
  }

  const eraNormalizedScore = Number(weightedTotal.toFixed(2));
  const powerScore = Number((eraNormalizedScore * 10).toFixed(1));

  return {
    ...p,
    ...identity,
    categoryScores,
    categoryDetails,           // ← NEW: this is what your frontend will display
    eraNormalizedScore,
    powerScore,
    lastUpdated: new Date().toISOString()
  };
});

// Save
fs.writeFileSync(rankingsPath, JSON.stringify(presidents, null, 2));
console.log(`✅ Done! Updated ${presidents.length} presidents with full transparency.`);
console.log("   → Misconduct now deducts properly");
console.log("   → categoryDetails added so your app can show every event + weight");
