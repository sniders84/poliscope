// scripts/presidents-scores.js
// Ultimate version: manual overrides for big events + full event preservation in categoryDetails

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const RANKINGS_PATH = path.join(ROOT, "public", "presidents-rankings.json");
const ERAS_PATH = path.join(ROOT, "scripts", "presidential-eras.js");

console.log("🚀 Running ultimate rubric with manual overrides and full event preservation...");

const presidents = JSON.parse(fs.readFileSync(RANKINGS_PATH, "utf-8"));
const eras = require(ERAS_PATH);

// Manual overrides for key events (title or summary match, case-insensitive)
const EVENT_OVERRIDES = {
  "cuban missile": { severity: 10, effectiveness: 10 }, // JFK
  "missile crisis": { severity: 10, effectiveness: 10 },
  "civil war": { severity: 10, effectiveness: 10 }, // Lincoln
  "emancipation": { severity: 10, effectiveness: 10 },
  "new deal": { severity: 10, effectiveness: 10 }, // FDR
  "world war": { severity: 10, effectiveness: 10 },
  "wwii": { severity: 10, effectiveness: 10 },
  "trust-busting": { severity: 8, effectiveness: 9 }, // TR
  "conservation": { severity: 8, effectiveness: 9 },
  "panama canal": { severity: 9, effectiveness: 9 },
  "coal strike": { severity: 8, effectiveness: 9 },
  "square deal": { severity: 8, effectiveness: 9 }
};

const CATEGORY_TAGS = {
  crisisManagement: ["crisis", "publichealth", "civilunrest", "security"],
  domesticPolicy:   ["domestic", "civilrights", "social", "infrastructure"],
  economicPolicy:   ["economic", "financial", "trade", "tariff", "debt"],
  foreignPolicy:    ["foreign", "diplomatic", "treaty", "war", "neutrality"],
  judicialPolicy:   ["judicial", "court", "supreme", "constitution"],
  legislation:      ["legislation", "act", "bill", "law", "charter"],
  misconduct:       ["misconduct", "scandal", "impeachment", "abuse", "failure"]
};

const CATEGORY_WEIGHTS = {
  crisisManagement: 0.28,
  domesticPolicy:   0.15,
  economicPolicy:   0.15,
  foreignPolicy:    0.15,
  judicialPolicy:   0.10,
  legislation:      0.10,
  misconduct:       0.07
};

function getEventCategories(event) {
  const cats = [];
  const eventTags = (event.tags || []).map(t => t.toLowerCase());
  for (const [catName, tagList] of Object.entries(CATEGORY_TAGS)) {
    if (eventTags.some(t => tagList.includes(t))) {
      cats.push(catName);
    }
  }
  return cats;
}

// Ultimate rubric with overrides
function applyRubricToEvent(event, presidentId) {
  const titleLower = (event.title || "").toLowerCase();
  const summaryLower = (event.summary || "").toLowerCase();

  // Check for manual override
  for (const [key, override] of Object.entries(EVENT_OVERRIDES)) {
    if (titleLower.includes(key) || summaryLower.includes(key)) {
      return override;
    }
  }

  const text = (titleLower + " " + summaryLower + " " + (event.tags?.join(" ") || "")).toLowerCase();
  const tags = event.tags || [];

  let severity = 5;
  if (tags.includes("crisis") || tags.includes("war") || tags.includes("rebellion") || /civil war|world war|depression|recession|pandemic|missile|hostage/i.test(text)) {
    severity = 10;
  } else if (tags.includes("security") || tags.includes("treaty") || tags.includes("diplomatic") || /frontier|indian|neutrality/i.test(text)) {
    severity = 8;
  } else if (tags.includes("economic") || /tax|tariff|bank|panic|debt/i.test(text)) {
    severity = 7;
  } else if (tags.includes("judicial") || tags.includes("legislation") || /court|act|bill/i.test(text)) {
    severity = 6;
  }
  if (tags.includes("misconduct")) severity = Math.max(severity, 8);

  let effectiveness = 5;
  if (/victory|preserved union|ended slavery|new deal|masterful|decisive|transformative|resolved|averted nuclear|saved|strong leadership|emancipation|trust-busting|conservation|square deal|big stick|missile crisis/i.test(text)) {
    effectiveness = 10;
  } else if (/success|secured|stabilized|proactive|unified|precedent|positive legacy|enduring/i.test(text)) {
    effectiveness = 9;
  } else if (/effective|pragmatic|restrained/i.test(text)) {
    effectiveness = 8;
  }
  if (/failed|mismanaged|worsened|resignation|impeached/i.test(text)) {
    effectiveness = Math.min(effectiveness, 4);
  }
  if (tags.includes("misconduct")) {
    effectiveness = Math.min(effectiveness, 5);
  }

  if (severity >= 8 && effectiveness >= 8) effectiveness = 10;
  if (severity >= 8 && effectiveness <= 5) effectiveness = Math.max(1, effectiveness - 1);

  return {
    severity: Math.min(10, Math.max(1, Math.round(severity))),
    effectiveness: Math.min(10, Math.max(1, Math.round(effectiveness)))
  };
}

// Score — NOW PRESERVES FULL EVENT DATA
function scoreEvent(event, presidentId) {
  const { severity, effectiveness } = applyRubricToEvent(event, presidentId);
  const contribution = effectiveness * (severity / 10);

  return {
    ...event,  // ← Preserve title, year, summary, tags, sources, etc.
    severity,
    effectiveness,
    contribution: Number(contribution.toFixed(2)),
    notes: "Ultimate rubric"
  };
}

// Main loop
const updatedPresidents = presidents.map(p => {
  const events = p.events || [];
  const scorable = events.filter(e => e.title);
  const numEvents = scorable.length;

  if (numEvents === 0) return getZeroScores(p);

  const categoryScores = {};
  const categoryDetails = {};
  let totalWeighted = 0;
  let highSeverityBonus = 0;

  Object.keys(CATEGORY_WEIGHTS).forEach(cat => {
    const catEvents = scorable.filter(e => getEventCategories(e).includes(cat));
    if (catEvents.length === 0) {
      categoryScores[cat] = 0;
      categoryDetails[cat] = [];
      return;
    }

    const scored = catEvents.map(e => scoreEvent(e, p.id));
    const avgContribution = scored.reduce((sum, s) => sum + s.contribution, 0) / scored.length;

    let catScore = Math.min(10, Math.max(-10, avgContribution));
    if (cat === "misconduct") catScore = -Math.abs(catScore);

    categoryScores[cat] = Number(catScore.toFixed(1));
    categoryDetails[cat] = scored; // Now contains full events + scores

    totalWeighted += catScore * CATEGORY_WEIGHTS[cat];

    highSeverityBonus += scored.filter(s => s.severity >= 8 && s.effectiveness >= 8).length * 2.0;
  });

  totalWeighted += highSeverityBonus;

  // Mild normalization
  let eraNormalizedScore = totalWeighted / Math.pow(numEvents + 1, 0.5);
  eraNormalizedScore = Number(Math.max(0, eraNormalizedScore).toFixed(2));

  let powerScore = Number((eraNormalizedScore * 10).toFixed(1));

  if (p.id === 9) {
    powerScore = 0.0;
    eraNormalizedScore = 0.0;
  }

  if (p.id === 1) {
    console.log("Washington final details:");
    console.log(categoryScores);
  }

  return {
    ...p,
    categoryScores,
    categoryDetails,
    eraNormalizedScore,
    powerScore,
    breakdown: {  // Save for modal transparency
      subtotal: Number(totalWeighted.toFixed(2)),
      highSeverityBonus: Number(highSeverityBonus.toFixed(2)),
      numEvents,
      normalizationFactor: Math.pow(numEvents + 1, 0.5).toFixed(2)
    },
    lastUpdated: new Date().toISOString()
  };
});

function getZeroScores(p) {
  return {
    ...p,
    categoryScores: Object.fromEntries(Object.keys(CATEGORY_WEIGHTS).map(k => [k, 0])),
    categoryDetails: Object.fromEntries(Object.keys(CATEGORY_WEIGHTS).map(k => [k, []])),
    powerScore: 0,
    eraNormalizedScore: 0,
    breakdown: { subtotal: 0, highSeverityBonus: 0, numEvents: 0, normalizationFactor: 1 },
    lastUpdated: new Date().toISOString()
  };
}

// Era rankings
const eraRankings = {};
Object.keys(eras).forEach(eraName => {
  const eraPres = updatedPresidents.filter(p => eras[eraName].includes(p.id));
  eraPres.sort((a, b) => b.powerScore - a.powerScore);

  eraRankings[eraName] = eraPres.map((p, idx) => ({
    id: p.id,
    name: p.name,
    powerScore: p.powerScore,
    rank: idx + 1
  }));

  console.log(`\nEra: ${eraName} (${eraPres.length} presidents)`);
  eraRankings[eraName].slice(0, 3).forEach(r => console.log(`  ${r.rank}. ${r.name} — ${r.powerScore}`));
  if (eraRankings[eraName].length > 3) {
    const last = eraRankings[eraName][eraRankings[eraName].length - 1];
    console.log(`  ... ${last.rank}. ${last.name} — ${last.powerScore}`);
  }
});

updatedPresidents.forEach(p => { p.eraRankings = eraRankings; });

// Save
fs.writeFileSync(RANKINGS_PATH, JSON.stringify(updatedPresidents, null, 2));

console.log(`\n✅ Ultimate locked-in rubric complete. Updated ${updatedPresidents.length} presidents.`);
console.log("   → Manual overrides for big events");
console.log("   → Full event data preserved in categoryDetails");
console.log("   → Hard refresh app to see final rankings");
