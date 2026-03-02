// scripts/presidents-scores.js
const fs = require("fs");
const path = require("path");

const rankingsPath = path.join(__dirname, "../public/presidents-rankings.json");
const infoPath = path.join(__dirname, "../public/presidents.json");
const erasPath = path.join(__dirname, "../scripts/presidential-eras.js");

console.log("🚀 Running ERA-BASED scoring engine...");

// Load files
let presidents = JSON.parse(fs.readFileSync(rankingsPath, "utf-8"));
const presInfo = JSON.parse(fs.readFileSync(infoPath, "utf-8"));
const eras = require(erasPath);

// Identity map
const identityMap = new Map();
for (const p of presInfo) {
  const key = p.presidentNumber;
  if (key) identityMap.set(key, { name: p.name, party: p.party, termStart: p.termStart, termEnd: p.termEnd, era: p.era, photo: p.photo, slug: p.slug, office: "President" });
}

// Weights
const CATEGORY_WEIGHTS = {
  crisisManagement: 0.18,
  domesticPolicy: 0.17,
  economicPolicy: 0.17,
  foreignPolicy: 0.17,
  judicialPolicy: 0.12,
  legislation: 0.12,
  misconduct: 0.07
};

// STRICT OUTCOME + HANDLING SEVERITY
function getEventSeverity(title = "", summary = "") {
  const text = (title + " " + (summary || "")).toLowerCase();

  if (text.includes("emancipation proclamation") || text.includes("civil rights act") || 
      text.includes("voting rights act") || text.includes("new deal") || 
      text.includes("social security") || text.includes("medicare") || 
      text.includes("federal reserve") || text.includes("interstate highway") || 
      text.includes("marshall plan") || text.includes("monroe doctrine") || 
      text.includes("gi bill") || text.includes("land-grant") || 
      text.includes("successfully resolved") || text.includes("led to victory") || 
      text.includes("saved the union") || text.includes("ended slavery")) {
    return 6.0;
  }

  if (text.includes("treaty") || text.includes("reform") || text.includes("signed the") || 
      text.includes("clean air") || text.includes("civil rights") || text.includes("homestead") || 
      text.includes("fair labor") || text.includes("wagner act") || 
      text.includes("good handling") || text.includes("effective") || text.includes("strong response")) {
    return 3.0;
  }

  if (text.includes("act of") || text.includes("legislation") || text.includes("law") || 
      text.includes("bill") || text.includes("tariff") || text.includes("budget")) {
    return 0.0;
  }

  if (text.includes("watergate") || text.includes("iran-contra") || text.includes("impeachment") || 
      text.includes("scandal") || text.includes("obstruction") || text.includes("perjury") || 
      text.includes("cover-up") || text.includes("high inflation") || text.includes("supply chain") || 
      text.includes("failed war") || text.includes("vietnam") || text.includes("great depression") || 
      text.includes("recession caused") || text.includes("covid") || text.includes("pandemic") || 
      text.includes("lockdown") || text.includes("mandate") || text.includes("stagflation") || 
      text.includes("internment") || text.includes("court-packing") || text.includes("failed response") || 
      text.includes("poor handling") || text.includes("mismanagement") || text.includes("worsened") || 
      text.includes("caused crisis")) {
    return -5.0;
  }

  if (text.includes("pardon") || text.includes("drone") || text.includes("intelligence") || 
      text.includes("controversy") || text.includes("embargo") || text.includes("intervention")) {
    return -2.5;
  }

  return 0.0;
}

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

  const raw = Math.min(10, Math.max(-10, total));
  let finalScore = isMisconduct ? -Math.abs(raw) : raw;

  if (isMisconduct && events.length > 0 && finalScore > -4.0) {
    finalScore = -4.0;
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

  let eraNormalizedScore = Number(Math.max(0, weightedTotal).toFixed(2));
  let powerScore = Number((eraNormalizedScore * 10).toFixed(1));

  // Hard-set Harrison (id 9) to 0
  if (p.id === 9) {
    powerScore = 0.0;
    eraNormalizedScore = 0.0;
    console.log("Hard-set William Henry Harrison (id 9) to 0 Power Score");
  }

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

// Era-based rankings
const eraRankings = {};
Object.keys(eras).forEach(eraName => {
  const ids = eras[eraName];
  const eraPresidents = presidents.filter(p => ids.includes(p.id));
  eraPresidents.sort((a, b) => b.powerScore - a.powerScore); // highest first

  eraRankings[eraName] = eraPresidents.map((p, index) => ({
    id: p.id,
    name: p.name,
    powerScore: p.powerScore,
    rank: index + 1
  }));

  // Log top 3 + bottom 1 per era for quick check
  console.log(`Era: ${eraName} (${eraPresidents.length} presidents)`);
  eraRankings[eraName].slice(0, 3).forEach(r => {
    console.log(`  ${r.rank}. ${r.name} - ${r.powerScore}`);
  });
  if (eraRankings[eraName].length > 3) {
    const last = eraRankings[eraName][eraRankings[eraName].length - 1];
    console.log(`  ... ${last.rank}. ${last.name} - ${last.powerScore} (last)`);
  }
});

presidents.forEach(p => {
  p.eraRankings = eraRankings;
});

// Save
fs.writeFileSync(rankingsPath, JSON.stringify(presidents, null, 2));
console.log(`✅ Done! Updated ${presidents.length} presidents with era-based rankings.`);
console.log("   → Harrison hard-set to 0");
console.log("   → Era rankings computed and attached");
