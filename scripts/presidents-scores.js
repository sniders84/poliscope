// scripts/presidents-scores.js
const fs = require("fs");
const path = require("path");

const TIMELINE_PATH = path.join(__dirname, "../public/presidents-full-timeline.json");
const RANKINGS_PATH = path.join(__dirname, "../public/presidents-rankings.json");
const erasPath = path.join(__dirname, "../scripts/presidential-eras.js");

console.log("Running pure count-based scoring...");

// Load timeline
let timeline;
try {
  timeline = JSON.parse(fs.readFileSync(TIMELINE_PATH, "utf-8"));
} catch (err) {
  console.error("Failed to load presidents-full-timeline.json:", err.message);
  process.exit(1);
}

const eras = require(erasPath);

// Score = number of major events minus twice the number of misconduct entries
function scorePresident(p) {
  const major = p.majorEvents?.length || 0;
  const misconduct = p.misconduct?.length || 0;
  return major - (misconduct * 2);
}

// Build rankings
const rankings = timeline.map(p => {
  const rawScore = scorePresident(p);

  return {
    id: p.id,
    name: p.name,
    rawScore: Number(rawScore.toFixed(1)),
    normalizedScore: 0, // filled below
    eventTotals: {
      major: p.majorEvents?.length || 0,
      minor: p.minorEvents?.length || 0,
      misconduct: p.misconduct?.length || 0,
      total: (p.majorEvents?.length || 0) + (p.minorEvents?.length || 0) + (p.misconduct?.length || 0)
    },
    note: p.id === 9 ? "Ranked last due to serving only 31 days in office." : "",
    lastUpdated: new Date().toISOString()
  };
});

// Era normalization
const eraAverages = {};
Object.keys(eras).forEach(eraName => {
  const ids = eras[eraName];
  const eraPres = rankings.filter(r => ids.includes(r.id));
  if (eraPres.length === 0) return;
  const sum = eraPres.reduce((acc, r) => acc + r.rawScore, 0);
  eraAverages[eraName] = sum / eraPres.length || 1;
});

rankings.forEach(r => {
  const era = Object.keys(eras).find(e => eras[e].includes(r.id));
  if (era && eraAverages[era]) {
    r.normalizedScore = Number((r.rawScore / eraAverages[era]).toFixed(2));
  } else {
    r.normalizedScore = r.rawScore;
  }
});

// Save
fs.writeFileSync(RANKINGS_PATH, JSON.stringify(rankings, null, 2));
console.log(`Scored ${rankings.length} presidents`);
console.log("Harrison note applied");
console.log("Era normalization complete");
