// scripts/presidents-scores.js
const fs = require("fs");
const path = require("path");

const TIMELINE_PATH = path.join(__dirname, "../public/presidents-full-timeline.json");
const RANKINGS_PATH = path.join(__dirname, "../public/presidents-rankings.json");
const erasPath = path.join(__dirname, "../scripts/presidential-eras.js");

console.log("🚀 Running simple scoring from presidents-full-timeline.json...");

// Load files
let timeline;
try {
  timeline = JSON.parse(fs.readFileSync(TIMELINE_PATH, "utf-8"));
} catch (err) {
  console.error("Failed to load presidents-full-timeline.json:", err.message);
  process.exit(1);
}

const eras = require(erasPath);

// Simple scoring logic (no complex keywords)
function scorePresident(p) {
  let rawScore = 0;

  // Major events: base +1 per event (presence = value)
  const majorCount = p.majorEvents?.length || 0;
  rawScore += majorCount * 1.0;

  // Bonus for positive language in summary
  (p.majorEvents || []).forEach(e => {
    const text = (e.title + " " + (e.summary || "")).toLowerCase();
    if (text.includes("success") || text.includes("stabilized") || text.includes("secured") ||
        text.includes("established") || text.includes("resolved") || text.includes("protected") ||
        text.includes("prevented") || text.includes("growth") || text.includes("expansion")) {
      rawScore += 1.0;
    }
  });

  // Minor events: 0.0 (ceremonial)
  // rawScore += 0;

  // Misconduct: -2 per event + extra penalty for bad language
  const misconductCount = p.misconduct?.length || 0;
  rawScore -= misconductCount * 2.0;

  (p.misconduct || []).forEach(e => {
    const text = (e.title + " " + (e.summary || "")).toLowerCase();
    if (text.includes("failed") || text.includes("controversy") || text.includes("backlash") ||
        text.includes("moral failing") || text.includes("abuse") || text.includes("exploitative") ||
        text.includes("violation") || text.includes("scandal")) {
      rawScore -= 1.0;
    }
  });

  return rawScore;
}

// Main engine
const rankings = timeline.map(p => {
  const rawScore = scorePresident(p);

  return {
    id: p.id,
    name: p.name,
    rawScore: Number(rawScore.toFixed(2)),
    normalizedScore: 0, // computed below
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
  eraAverages[eraName] = sum / eraPres.length || 1; // avoid divide by zero
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
console.log(`✅ Done! Scored ${rankings.length} presidents → ${RANKINGS_PATH}`);
console.log(" → Harrison note applied");
console.log(" → Era normalization complete");
