// scripts/presidents-scores.js
// Tuned rubric for historical accuracy (higher for Washington etc.)

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const RANKINGS_PATH = path.join(ROOT, "public", "presidents-rankings.json");
const ERAS_PATH = path.join(ROOT, "scripts", "presidential-eras.js");

console.log("🚀 Running tuned rubric-based scoring...");

const presidents = JSON.parse(fs.readFileSync(RANKINGS_PATH, "utf-8"));
const eras = require(ERAS_PATH);

// Category tags
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
  crisisManagement: 0.18,
  domesticPolicy:   0.17,
  economicPolicy:   0.17,
  foreignPolicy:    0.17,
  judicialPolicy:   0.12,
  legislation:      0.12,
  misconduct:       0.07
};

// Categories from tags
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

// Tuned rubric (higher for revered leaders like Washington)
function applyRubricToEvent(event, presidentId) {
  const text = ((event.title || "") + " " + (event.summary || "") + " " + (event.tags?.join(" ") || "")).toLowerCase();
  const tags = event.tags || [];

  // Severity (1–10): higher for early/foundational
  let severity = 4;
  if (tags.includes("crisis") || tags.includes("war") || /civil war|world war|depression|recession|pandemic/i.test(text)) {
    severity = 9;
  } else if (tags.includes("security") || tags.includes("treaty") || /frontier|indian|rebellion|neutrality/i.test(text)) {
    severity = 7;
  } else if (tags.includes("economic") || /tax|tariff|bank|panic|debt/i.test(text)) {
    severity = 6;
  } else if (tags.includes("judicial") || tags.includes("legislation") || /court|act|bill/i.test(text)) {
    severity = 5;
  }
  if (tags.includes("misconduct") || /scandal|impeachment/i.test(text)) {
    severity = Math.max(severity, 8);
  }
  // Boost for early presidents (id < 10)
  if (presidentId < 10) severity = Math.min(10, severity + 1);

  // Effectiveness (1–10): boost for Washington's key words
  let effectiveness = 6;
  if (/resolved|victory|success|averted|stabilized|secured|decisive|strong|masterful|preserved|effective|pragmatic|precedent|unified/i.test(text)) {
    effectiveness = 9;
  } else if (/restrained|legacy|positive|proactive/i.test(text)) {
    effectiveness = 8;
  }
  if (/failed|mismanaged|worsened|divided|controversial|resignation|impeached/i.test(text)) {
    effectiveness = 3;
  } else if (/delayed|passive|inaction|abuse|overreach/i.test(text)) {
    effectiveness = 2;
  }
  if (tags.includes("misconduct")) {
    effectiveness = Math.min(effectiveness, 2);
  }

  // Crisis handling bonus
  if (severity >= 7 && effectiveness >= 7) effectiveness = Math.min(10, effectiveness + 1);
  if (severity >= 7 && effectiveness <= 4) effectiveness = Math.max(1, effectiveness - 1);

  return {
    severity: Math.min(10, Math.max(1, Math.round(severity))),
    effectiveness: Math.min(10, Math.max(1, Math.round(effectiveness)))
  };
}

// Score event
function scoreEvent(event, presidentId) {
  const { severity, effectiveness } = applyRubricToEvent(event, presidentId);
  const contribution = effectiveness * (severity / 10);

  return {
    event: event.title,
    year: event.year,
    severity,
    effectiveness,
    contribution: Number(contribution.toFixed(2)),
    notes: "Tuned rubric"
  };
}

// Main
const updatedPresidents = presidents.map(p => {
  const events = p.events || [];
  const scorable = events.filter(e => e.title);

  if (scorable.length === 0) {
    return getZeroScores(p);
  }

  const categoryScores = {};
  const categoryDetails = {};
  let totalWeighted = 0;

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
    categoryDetails[cat] = scored;

    totalWeighted += catScore * CATEGORY_WEIGHTS[cat];
  });

  let eraNormalizedScore = Number(Math.max(0, totalWeighted).toFixed(2));
  let powerScore = Number((eraNormalizedScore * 10).toFixed(1));

  if (p.id === 9) {
    powerScore = 0.0;
    eraNormalizedScore = 0.0;
  }

  // Debug log for Washington
  if (p.id === 1) {
    console.log("Washington details:");
    console.log(categoryScores);
  }

  return {
    ...p,
    categoryScores,
    categoryDetails,
    eraNormalizedScore,
    powerScore,
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

console.log(`\n✅ Tuned rubric complete. Updated ${updatedPresidents.length} presidents.`);
console.log("   → Washington's scores boosted");
console.log("   → Reload app / clear cache to see new JSON");
