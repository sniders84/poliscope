// scripts/presidents-scores.js
// Scores presidents based on the new streamlined structure:
// - Single `events` array per president
// - Only events with severity & effectiveness are scored
// - Categories are derived from event tags (no separate category objects)
// - Weighted overall score + era rankings

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const RANKINGS_PATH = path.join(ROOT, "public", "presidents-rankings.json");
const ERAS_PATH = path.join(ROOT, "scripts", "presidential-eras.js");

console.log("🚀 Running streamlined scoring engine (events-based)...");

// Load data
const presidents = JSON.parse(fs.readFileSync(RANKINGS_PATH, "utf-8"));
const eras = require(ERAS_PATH);

// Category → tag mapping (events can belong to multiple categories)
const CATEGORY_TAGS = {
  crisisManagement: ["crisis", "publichealth", "civilunrest", "security"],
  domesticPolicy:  ["domestic", "civilrights", "social", "infrastructure"],
  economicPolicy:  ["economic", "financial", "trade", "tariff", "debt"],
  foreignPolicy:   ["foreign", "diplomatic", "treaty", "war", "neutrality"],
  judicialPolicy:  ["judicial", "court", "supreme", "constitution"],
  legislation:     ["legislation", "act", "bill", "law", "charter"],
  misconduct:      ["misconduct", "scandal", "impeachment", "abuse", "failure"]
};

// Weights (same as before, sums to 1.0)
const CATEGORY_WEIGHTS = {
  crisisManagement: 0.18,
  domesticPolicy:   0.17,
  economicPolicy:   0.17,
  foreignPolicy:    0.17,
  judicialPolicy:   0.12,
  legislation:      0.12,
  misconduct:       0.07
};

// Helper: classify event into categories based on tags
function getEventCategories(event) {
  const cats = [];
  for (const [catName, tags] of Object.entries(CATEGORY_TAGS)) {
    if (event.tags?.some(t => tags.includes(t.toLowerCase()))) {
      cats.push(catName);
    }
  }
  return cats;
}

// Score one event (severity already set in bootstrap/merge; effectiveness is response quality)
function scoreEvent(event) {
  if (!event.severity || !event.effectiveness) return null; // skip non-scorable

  // Simple formula: contribution = effectiveness * (severity / 10)   → rewards handling hard events well
  const contribution = event.effectiveness * (event.severity / 10);

  return {
    event: event.title,
    year: event.year,
    severity: Number(event.severity.toFixed(1)),
    effectiveness: Number(event.effectiveness.toFixed(1)),
    contribution: Number(contribution.toFixed(2)),
    notes: event.notes || ""
  };
}

// Main scoring logic per president
const updatedPresidents = presidents.map(p => {
  const scorableEvents = (p.events || []).filter(e => e.severity && e.effectiveness);

  if (scorableEvents.length === 0) {
    console.log(`No scorable events for ${p.name} (id ${p.id})`);
    return {
      ...p,
      categoryScores: Object.fromEntries(Object.keys(CATEGORY_WEIGHTS).map(k => [k, 0])),
      categoryDetails: Object.fromEntries(Object.keys(CATEGORY_WEIGHTS).map(k => [k, []])),
      overallPowerScore: 0,
      eraNormalizedScore: 0,
      lastUpdated: new Date().toISOString()
    };
  }

  // Aggregate per category
  const categoryScores = {};
  const categoryDetails = {};
  let totalWeighted = 0;

  Object.keys(CATEGORY_WEIGHTS).forEach(cat => {
    const catEvents = scorableEvents.filter(e => getEventCategories(e).includes(cat));
    if (catEvents.length === 0) {
      categoryScores[cat] = 0;
      categoryDetails[cat] = [];
      return;
    }

    const scored = catEvents.map(scoreEvent).filter(Boolean);
    const avgEffectiveness = scored.reduce((sum, s) => sum + s.effectiveness, 0) / scored.length;
    const avgContribution = scored.reduce((sum, s) => sum + s.contribution, 0) / scored.length;

    // Category score = average contribution (capped -10 to +10)
    let catScore = Math.min(10, Math.max(-10, avgContribution));
    if (cat === "misconduct") catScore = -Math.abs(catScore); // misconduct always penalizes

    categoryScores[cat] = Number(catScore.toFixed(2));
    categoryDetails[cat] = scored;

    totalWeighted += catScore * CATEGORY_WEIGHTS[cat];
  });

  // Final scores
  let eraNormalizedScore = Number(Math.max(0, totalWeighted).toFixed(2));
  let overallPowerScore = Number((eraNormalizedScore * 10).toFixed(1));

  // Hard override for short/no-impact terms
  if (p.id === 9) { // William Henry Harrison
    overallPowerScore = 0.0;
    eraNormalizedScore = 0.0;
    console.log(`Hard-set William Henry Harrison (id 9) to 0`);
  }

  return {
    ...p,
    categoryScores,
    categoryDetails,           // optional — remove if file size becomes issue
    eraNormalizedScore,
    overallPowerScore,
    lastUpdated: new Date().toISOString()
  };
});

// Era rankings
const eraRankings = {};
Object.keys(eras).forEach(eraName => {
  const eraIds = eras[eraName];
  const eraPres = updatedPresidents.filter(p => eraIds.includes(p.id));
  eraPres.sort((a, b) => b.overallPowerScore - a.overallPowerScore);

  eraRankings[eraName] = eraPres.map((p, idx) => ({
    id: p.id,
    name: p.name,
    overallPowerScore: p.overallPowerScore,
    rank: idx + 1
  }));

  // Quick debug log
  console.log(`\nEra: ${eraName} (${eraPres.length} presidents)`);
  eraRankings[eraName].slice(0, 3).forEach(r => {
    console.log(`  ${r.rank}. ${r.name} — ${r.overallPowerScore}`);
  });
  if (eraRankings[eraName].length > 3) {
    const last = eraRankings[eraName][eraRankings[eraName].length - 1];
    console.log(`  ... ${last.rank}. ${last.name} — ${last.overallPowerScore}`);
  }
});

// Attach era rankings to every president (if you still want this)
updatedPresidents.forEach(p => {
  p.eraRankings = eraRankings;
});

// Save updated file
fs.writeFileSync(RANKINGS_PATH, JSON.stringify(updatedPresidents, null, 2));

console.log(`\n✅ Scoring complete. Updated ${updatedPresidents.length} presidents.`);
console.log("   → Uses single events array + tag-based categories");
console.log("   → Only scorable events (with severity & effectiveness) contribute");
console.log("   → Saved to: " + RANKINGS_PATH);
