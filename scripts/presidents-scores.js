// presidents-scores.js
// Hybrid scoring model with identity preservation and hybrid-tone summaries.
// Computes category scores using eventCount, impactScore, significanceScore,
// applies your existing category weights, and outputs stable powerScores.

const fs = require("fs");
const path = require("path");

const rankingsPath = path.join(__dirname, "../public/presidents-rankings.json");
const infoPath = path.join(__dirname, "../public/presidents.json");

console.log("Starting presidents-scores.js");

// ------------------------------------------------------------
// LOAD FILES
// ------------------------------------------------------------

let presidents = JSON.parse(fs.readFileSync(rankingsPath, "utf-8"));
const presInfo = JSON.parse(fs.readFileSync(infoPath, "utf-8"));

// ------------------------------------------------------------
// BUILD MASTER IDENTITY MAP (presidentId → bioguide fallback)
// ------------------------------------------------------------

function extractId(p) {
  const presId = p.presidentId || null;
  const bioId = p.bioguideId || p.bioguide || null;
  return presId || (bioId ? bioId.toUpperCase() : null);
}

const identityMap = new Map();

for (const p of presInfo) {
  const key = extractId(p);
  if (!key) continue;

  identityMap.set(key, {
    name: p.name,
    party: p.party,
    termStart: p.termStart,
    termEnd: p.termEnd,
    era: p.era,
    photo: p.photo || null,
    presidentId: p.presidentId || null,
    bioguideId: p.bioguideId || p.bioguide || null,
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
// HYBRID CATEGORY SCORING
// ------------------------------------------------------------

function scoreCategory(cat) {
  if (!cat) return 0;

  const eventCount = Number(cat.eventCount || 0);
  const impact = Number(cat.impactScore || 0);
  const significance = Number(cat.significanceScore || 0);

  const raw =
    (0.5 * impact) +
    (0.3 * significance) +
    (0.2 * eventCount);

  return Math.max(0, Math.min(10, Number(raw.toFixed(2))));
}

// ------------------------------------------------------------
// HYBRID-TONE SUMMARY GENERATOR
// ------------------------------------------------------------

function makeSummary(categoryName, score) {
  const tone = {
    crisisManagement:
      "This reflects the scale and historical weight of the president’s crisis leadership, balancing the number of major events with their overall impact.",
    domesticPolicy:
      "This reflects the breadth and influence of the president’s domestic agenda, weighing both the significance and activity level of key initiatives.",
    economicPolicy:
      "This reflects the president’s economic footprint, balancing the impact of major decisions with their long-term significance.",
    foreignPolicy:
      "This reflects the president’s foreign policy influence, considering both the importance of key actions and the overall level of activity.",
    judicialPolicy:
      "This reflects the president’s judicial legacy, balancing the significance of appointments and constitutional actions.",
    legislation:
      "This reflects the president’s legislative impact, weighing the importance and scope of major laws enacted.",
    misconduct:
      "This reflects the scale and seriousness of ethical or constitutional misconduct during the president’s tenure."
  };

  return `${tone[categoryName]} (Score: ${score.toFixed(1)})`;
}

// ------------------------------------------------------------
// MAIN SCORING ENGINE
// ------------------------------------------------------------

presidents = presidents.map(p => {
  const key =
    p.presidentId ||
    (p.bioguideId ? p.bioguideId.toUpperCase() : null);

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
    const catScore = scoreCategory(catData);
    categoryScores[catName] = catScore;
    weightedTotal += catScore * CATEGORY_WEIGHTS[catName];
  }

  const eraNormalizedScore = Number(weightedTotal.toFixed(2));
  const powerScore = Number((eraNormalizedScore * 10).toFixed(1));

  const summaries = {};
  for (const [catName, score] of Object.entries(categoryScores)) {
    summaries[catName] = makeSummary(catName, score);
  }

  return {
    ...p,
    ...identity,
    categoryScores,
    eraNormalizedScore,
    powerScore,
    summaries,
    lastUpdated: new Date().toISOString()
  };
});

// ------------------------------------------------------------
// WRITE OUTPUT
// ------------------------------------------------------------

fs.writeFileSync(rankingsPath, JSON.stringify(presidents, null, 2));
console.log(`Updated presidents-rankings.json with hybrid-model Power Scores (${presidents.length} records)`);
