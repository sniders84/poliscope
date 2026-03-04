// scripts/presidents-scores.js
const fs = require("fs");
const path = require("path");

const TIMELINE_PATH = path.join(__dirname, "../public/presidents-full-timeline.json");
const RANKINGS_PATH = path.join(__dirname, "../public/presidents-rankings.json");
const erasPath = path.join(__dirname, "../scripts/presidential-eras.js");

console.log("🚀 Running scoring from presidents-full-timeline.json...");

// Load files
let timeline;
try {
  timeline = JSON.parse(fs.readFileSync(TIMELINE_PATH, "utf-8"));
} catch (err) {
  console.error("Failed to load presidents-full-timeline.json:", err.message);
  process.exit(1);
}

const eras = require(erasPath);

// Weights for event types
const WEIGHTS = {
  major: 2.0,
  minor: 0.0,      // ceremonial → no score
  misconduct: -2.0 // misconduct → negative
};

// Updated severity function — tuned to match your real event titles/summaries
function getEventSeverity(title = "", summary = "") {
  const text = (title + " " + (summary || "")).toLowerCase();

  // Strong positive — foundational laws, major expansions, stabilization, successes
  if (text.includes("louisiana purchase") || text.includes("judiciary act") ||
      text.includes("bank act") || text.includes("tariff act") ||
      text.includes("bill of rights") || text.includes("neutrality proclamation") ||
      text.includes("jay treaty") || text.includes("treaty of greenville") ||
      text.includes("chips") || text.includes("inflation reduction") ||
      text.includes("infrastructure investment") || text.includes("american rescue") ||
      text.includes("success") || text.includes("stabilized") || text.includes("secured") ||
      text.includes("established") || text.includes("foundational") || text.includes("legacy") ||
      text.includes("expansion") || text.includes("charter") || text.includes("departmental") ||
      text.includes("residence act") || text.includes("infrastructure") || text.includes("investment") ||
      text.includes("second bank") || text.includes("tariff of 1816") || text.includes("coinage act") ||
      text.includes("navy") || text.includes("naval") || text.includes("military reform") ||
      text.includes("post-revolutionary") || text.includes("debt crisis") || text.includes("panic") ||
      text.includes("missouri compromise") || text.includes("monroe doctrine")) {
    return 5.0; // strong positive legacy
  }

  // Moderate positive — effective laws, reforms, resolutions, acts
  if (text.includes("act") || text.includes("treaty") || text.includes("signed") ||
      text.includes("repeal") || text.includes("reduction") || text.includes("growth") ||
      text.includes("resolved") || text.includes("protected") || text.includes("prevented") ||
      text.includes("charter") || text.includes("infrastructure") || text.includes("investment") ||
      text.includes("second bank") || text.includes("tariff") || text.includes("coinage") ||
      text.includes("department") || text.includes("navy") || text.includes("naval") ||
      text.includes("declaration") || text.includes("authorization") || text.includes("war of 1812")) {
    return 3.0;
  }

  // Neutral / ceremonial / routine
  if (text.includes("inaugural") || text.includes("farewell") || text.includes("address") ||
      text.includes("proclamation") || text.includes("message") || text.includes("appointment") ||
      text.includes("move") || text.includes("convenes") || text.includes("ceremonial") ||
      text.includes("cornerstone") || text.includes("day of thanksgiving") || text.includes("message") ||
      text.includes("veto") || text.includes("electors") || text.includes("state of the union") ||
      text.includes("annual state") || text.includes("special message") || text.includes("ratified") ||
      text.includes("nominates") || text.includes("confirmed") || text.includes("capital moves") ||
      text.includes("congress convenes")) {
    return 0.0;
  }

  // Negative — misconduct, controversy, failure, harm, suppression
  if (text.includes("enslavement") || text.includes("enslaved") || text.includes("runaway") ||
      text.includes("alien and sedition") || text.includes("suppression") || text.includes("dissent") ||
      text.includes("embargo") || text.includes("controversy") || text.includes("backlash") ||
      text.includes("failed") || text.includes("devastated") || text.includes("hardship") ||
      text.includes("scandal") || text.includes("investigation") || text.includes("impeachment") ||
      text.includes("classified documents") || text.includes("hunter biden") || text.includes("moral failing") ||
      text.includes("exploitative") || text.includes("abuse") || text.includes("violation") ||
      text.includes("resistance") || text.includes("panic") || text.includes("epidemic") ||
      text.includes("yellow fever") || text.includes("genêt") || text.includes("genet") ||
      text.includes("burning") || text.includes("defeat") || text.includes("crisis") ||
      text.includes("protest") || text.includes("rebellion") || text.includes("conflict") ||
      text.includes("impeachment") || text.includes("insurrection")) {
    return -5.0; // strong penalty
  }

  return 0.0; // default neutral
}

// Score a president's events
function scorePresident(p) {
  let rawScore = 0;

  // Major events — weight 2.0
  (p.majorEvents || []).forEach(e => {
    const severity = getEventSeverity(e.title || "", e.summary || "");
    rawScore += severity * 2.0;
  });

  // Minor events — weight 0.0 (ceremonial)
  // (p.minorEvents || []).forEach(e => rawScore += 0.0);

  // Misconduct — negative weight 2.0
  (p.misconduct || []).forEach(e => {
    const severity = getEventSeverity(e.title || "", e.summary || "");
    rawScore += severity * -2.0;
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
