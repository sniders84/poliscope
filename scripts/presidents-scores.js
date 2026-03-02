// scripts/presidents-scores.js
const fs = require("fs");
const path = require("path");

const rankingsPath = path.join(__dirname, "../public/presidents-rankings.json");
const infoPath = path.join(__dirname, "../public/presidents.json");

console.log("🚀 Running STRICTER, OUTCOME-FOCUSED scoring engine...");

// Load files
let presidents = JSON.parse(fs.readFileSync(rankingsPath, "utf-8"));
const presInfo = JSON.parse(fs.readFileSync(infoPath, "utf-8"));

// Identity map
const identityMap = new Map();
for (const p of presInfo) {
  const key = p.presidentNumber;
  if (key) identityMap.set(key, { name: p.name, party: p.party, termStart: p.termStart, termEnd: p.termEnd, era: p.era, photo: p.photo, slug: p.slug, office: "President" });
}

// Weights (unchanged)
const CATEGORY_WEIGHTS = {
  crisisManagement: 0.18,
  domesticPolicy: 0.17,
  economicPolicy: 0.17,
  foreignPolicy: 0.17,
  judicialPolicy: 0.12,
  legislation: 0.12,
  misconduct: 0.07
};

// STRICTER SEVERITY: Big rewards for iconic wins, heavy penalties for failures/bad handling
function getEventSeverity(title = "", summary = "") {
  const text = (title + " " + (summary || "")).toLowerCase();

  // ICONIC POSITIVE (huge legacy boost)
  if (text.includes("emancipation proclamation") || text.includes("civil rights act") || 
      text.includes("voting rights act") || text.includes("new deal") || 
      text.includes("social security") || text.includes("medicare") || 
      text.includes("federal reserve") || text.includes("interstate highway") || 
      text.includes("marshall plan") || text.includes("monroe doctrine") || 
      text.includes("gi bill") || text.includes("land-grant") || text.includes("union preserved")) {
    return 6.0;  // max reward
  }

  // STRONG POSITIVE (good handling/successful reforms)
  if (text.includes("treaty") || text.includes("reform") || text.includes("signed the") || 
      text.includes("clean air") || text.includes("civil rights") || text.includes("homestead") || 
      text.includes("fair labor") || text.includes("wagner act") || text.includes("good handling") || 
      text.includes("successful") || text.includes("resolved")) {
    return 3.5;
  }

  // MEDIUM POSITIVE (routine success)
  if (text.includes("act of") || text.includes("legislation") || text.includes("law") || 
      text.includes("bill") || text.includes("tariff") || text.includes("budget")) {
    return 1.5;
  }

  // STRONG NEGATIVE (major failures, scandals, bad outcomes)
  if (text.includes("watergate") || text.includes("iran-contra") || text.includes("impeachment") || 
      text.includes("scandal") || text.includes("obstruction") || text.includes("perjury") || 
      text.includes("cover-up") || text.includes("high inflation") || text.includes("supply chain") || 
      text.includes("failed war") || text.includes("vietnam") || text.includes("great depression") || 
      text.includes("recession caused") || text.includes("covid") || text.includes("pandemic") || 
      text.includes("lockdown") || text.includes("mandate") || text.includes("stagflation") || 
      text.includes("internment") || text.includes("court-packing") || text.includes("failed response") || 
      text.includes("poor handling") || text.includes("mismanagement")) {
    return -6.0;  // heavy penalty
  }

  // MEDIUM NEGATIVE (controversial or mixed)
  if (text.includes("pardon") || text.includes("drone") || text.includes("intelligence") || 
      text.includes("controversy") || text.includes("embargo") || text.includes("intervention")) {
    return -3.0;
  }

  return 1.0; // default neutral
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

  // Cap raw score, but allow deeper negatives for bad handling
  const raw = Math.min(10, Math.max(-10, total));
  let finalScore = isMisconduct ? -Math.abs(raw) : raw;

  // Extra misconduct penalty if any events exist
  if (isMisconduct && events.length > 0 && finalScore > -3.0) {
    finalScore = -3.0;  // minimum penalty for any misconduct
  }

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
    categoryDetails,
    eraNormalizedScore,
    powerScore,
    lastUpdated: new Date().toISOString()
  };
});

// Save
fs.writeFileSync(rankingsPath, JSON.stringify(presidents, null, 2));
console.log(`✅ Done! Updated ${presidents.length} presidents with stricter, outcome-focused scoring.`);
console.log("   → Heavy penalties for bad handling, failures, and scandals");
console.log("   → Strong rewards only for iconic legacy wins");
console.log("   → categoryDetails ready for future expandable scorecards");
