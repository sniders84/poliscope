// scripts/presidents-scores.js
const fs = require("fs");
const path = require("path");

const rankingsPath = path.join(__dirname, "../public/presidents-rankings.json");
const infoPath = path.join(__dirname, "../public/presidents.json");

console.log("Starting presidents-scores.js - OBJECTIVE MODE (no placeholders)");

// ------------------------------------------------------------
// LOAD FILES
// ------------------------------------------------------------
let presidents = JSON.parse(fs.readFileSync(rankingsPath, "utf-8"));
const presInfo = JSON.parse(fs.readFileSync(infoPath, "utf-8"));

// ------------------------------------------------------------
// IDENTITY MAP
// ------------------------------------------------------------
const identityMap = new Map();
for (const p of presInfo) {
  const key = p.presidentNumber;
  if (!key) continue;
  identityMap.set(key, {
    name: p.name,
    party: p.party,
    termStart: p.termStart,
    termEnd: p.termEnd,
    era: p.era,
    photo: p.photo || null,
    slug: p.slug || null,
    office: "President"
  });
}

// ------------------------------------------------------------
// CATEGORY WEIGHTS (unchanged)
// ------------------------------------------------------------
const CATEGORY_WEIGHTS = {
  crisisManagement: 0.18,
  domesticPolicy: 0.17,
  economicPolicy: 0.17,
  foreignPolicy: 0.17,
  judicialPolicy: 0.12,
  legislation: 0.12,
  misconduct: 0.07
};

// ------------------------------------------------------------
// SEVERITY SCORING ENGINE (this is the new heart)
// ------------------------------------------------------------
function getEventSeverity(title, summary) {
  const text = (title + " " + summary).toLowerCase();

  // VERY HIGH IMPACT (4.0)
  if (text.includes("war") || text.includes("depression") || text.includes("civil rights act") ||
      text.includes("voting rights") || text.includes("impeachment") || text.includes("watergate") ||
      text.includes("iran-contra") || text.includes("9/11") || text.includes("great recession")) {
    return 4.0;
  }
  // HIGH IMPACT (3.0)
  if (text.includes("social security") || text.includes("medicare") || text.includes("medicaid") ||
      text.includes("nafta") || text.includes("tax reform") || text.includes("clean air") ||
      text.includes("affordable care") || text.includes("interstate highway")) {
    return 3.0;
  }
  // MEDIUM (2.0)
  if (text.includes("treaty") || text.includes("act of") || text.includes("reform") ||
      text.includes("scandal") || text.includes("pardon") || text.includes("drone")) {
    return 2.0;
  }
  // LOW / ROUTINE (1.0)
  return 1.0;
}

// ------------------------------------------------------------
// SCORE A SINGLE CATEGORY
// ------------------------------------------------------------
function scoreCategory(cat, isMisconduct = false) {
  if (!cat || !cat.events && !cat.majorEvents) return 0;

  const events = cat.events || cat.majorEvents || [];
  let total = 0;

  events.forEach(event => {
    const severity = getEventSeverity(event.title || "", event.summary || "");
    total += severity;
  });

  const rawScore = Math.min(10, total);           // cap at 10

  return isMisconduct ? -rawScore : rawScore;     // misconduct becomes negative
}

// ------------------------------------------------------------
// MAIN SCORING ENGINE
// ------------------------------------------------------------
presidents = presidents.map(p => {
  const key = p.id;
  const identity = identityMap.get(key) || {};

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
  let weightedTotal = 0;

  for (const [catName, catData] of Object.entries(categories)) {
    const isMisconduct = catName === "misconduct";
    const catScore = scoreCategory(catData, isMisconduct);

    categoryScores[catName] = Number(catScore.toFixed(2));
    weightedTotal += catScore * CATEGORY_WEIGHTS[catName];
  }

  const eraNormalizedScore = Number(weightedTotal.toFixed(2));
  const powerScore = Number((eraNormalizedScore * 10).toFixed(1));

  return {
    ...p,
    ...identity,
    categoryScores,
    eraNormalizedScore,
    powerScore,
    lastUpdated: new Date().toISOString()
  };
});

// ------------------------------------------------------------
// WRITE OUTPUT
// ------------------------------------------------------------
fs.writeFileSync(rankingsPath, JSON.stringify(presidents, null, 2));
console.log(`✅ Updated presidents-rankings.json with OBJECTIVE scoring (${presidents.length} records)`);
console.log("   → Placeholders ignored | All scoring now based on real events + severity rules");
