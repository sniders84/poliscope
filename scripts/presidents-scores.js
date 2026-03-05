// scripts/presidents-scores.js
// Rubric-based scoring: approximates severity & effectiveness via tags/keywords
// Applies to all events; computes category scores and overallPowerScore

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const RANKINGS_PATH = path.join(ROOT, "public", "presidents-rankings.json");
const ERAS_PATH = path.join(ROOT, "scripts", "presidential-eras.js");

console.log("🚀 Running rubric-based scoring engine...");

const presidents = JSON.parse(fs.readFileSync(RANKINGS_PATH, "utf-8"));
const eras = require(ERAS_PATH);

// Category → tag mapping
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

// Helper: classify event into categories based on its tags
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

// Rubric heuristic: approximate severity & effectiveness
function applyRubricToEvent(event) {
  if (event.severity > 0 && event.effectiveness > 0) {
    return { severity: event.severity, effectiveness: event.effectiveness };
  }

  const text = ((event.title || "") + " " + (event.summary || "") + " " + (event.tags?.join(" ") || "")).toLowerCase();
  const tags = event.tags || [];

  // Severity (1–10): how big/national the impact was
  let severity = 3; // baseline
  if (tags.includes("crisis") || tags.includes("war") || /civil war|world war|depression|recession|pandemic|epidemic/i.test(text)) {
    severity = 8;
  } else if (tags.includes("security") || tags.includes("treaty") || tags.includes("diplomatic") || /frontier|rebellion|uprising/i.test(text)) {
    severity = 6;
  } else if (tags.includes("economic") || tags.includes("trade") || /tax|tariff|bank|panic|inflation/i.test(text)) {
    severity = 5;
  } else if (tags.includes("judicial") || tags.includes("legislation") || /court|act|bill/i.test(text)) {
    severity = 4;
  }
  if (tags.includes("misconduct") || /scandal|impeachment|cover-up/i.test(text)) {
    severity = Math.max(severity, 7); // scandals damage trust nationally
  }

  // Effectiveness (1–10): how well handled
  let effectiveness = 5; // neutral
  if (/resolved|victory|success|averted|stabilized|secured|decisive|strong|masterful|preserved|effective|pragmatic/i.test(text)) {
    effectiveness = 8;
  } else if (/restrained|precedent|unified|coalition/i.test(text)) {
    effectiveness = 7;
  }
  if (/failed|mismanaged|worsened|divided|controversial|resignation|impeached|scandal/i.test(text)) {
    effectiveness = 3;
  } else if (/delayed|passive|inaction|abuse|overreach/i.test(text)) {
    effectiveness = 2;
  }
  if (tags.includes("misconduct")) {
    effectiveness = Math.min(effectiveness, 3);
  }

  // Bonus/penalty for crisis handling
  if (severity >= 7 && effectiveness >= 7) effectiveness = Math.min(10, effectiveness + 1);
  if (severity >= 7 && effectiveness <= 4) effectiveness = Math.max(1, effectiveness - 1);

  return {
    severity: Math.min(10, Math.max(1, Math.round(severity))),
    effectiveness: Math.min(10, Math.max(1, Math.round(effectiveness)))
  };
}

// Score one event
function scoreEvent(event) {
  const { severity, effectiveness } = applyRubricToEvent(event);
  const contribution = effectiveness * (severity / 10);

  return {
    event: event.title,
    year: event.year,
    severity,
    effectiveness,
    contribution: Number(contribution.toFixed(2)),
    notes: event.notes || "Rubric heuristic"
  };
}

// Main president processor
const updatedPresidents = presidents.map(p => {
  const events = p.events || [];
  const scorable = events.filter(e => e.title);

  if (scorable.length === 0) {
    console.log(`No events for ${p.name} (id ${p.id})`);
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

    const scored = catEvents.map(scoreEvent);
    const avgContribution = scored.reduce((sum, s) => sum + s.contribution, 0) / scored.length;

    let catScore = Math.min(10, Math.max(-10, avgContribution));
    if (cat === "misconduct") catScore = -Math.abs(catScore);

    categoryScores[cat] = Number(catScore.toFixed(2));
    categoryDetails[cat] = scored;

    totalWeighted += catScore * CATEGORY_WEIGHTS[cat];
  });

  let eraNormalizedScore = Number(Math.max(0, totalWeighted).toFixed(2));
  let overallPowerScore = Number((eraNormalizedScore * 10).toFixed(1));

  if (p.id === 9) {
    overallPowerScore = 0.0;
    eraNormalizedScore = 0.0;
    console.log(`Hard-set William Henry Harrison (id 9) to 0`);
  }

  return {
    ...p,
    categoryScores,
    categoryDetails,
    eraNormalizedScore,
    overallPowerScore,
    lastUpdated: new Date().toISOString()
  };
});

function getZeroScores(p) {
  return {
    ...p,
    categoryScores: Object.fromEntries(Object.keys(CATEGORY_WEIGHTS).map(k => [k, 0])),
    categoryDetails: Object.fromEntries(Object.keys(CATEGORY_WEIGHTS).map(k => [k, []])),
    overallPowerScore: 0,
    eraNormalizedScore: 0,
    lastUpdated: new Date().toISOString()
  };
}

// Era rankings
const eraRankings = {};
Object.keys(eras).forEach(eraName => {
  const eraPres = updatedPresidents.filter(p => eras[eraName].includes(p.id));
  eraPres.sort((a, b) => b.overallPowerScore - a.overallPowerScore);

  eraRankings[eraName] = eraPres.map((p, idx) => ({
    id: p.id,
    name: p.name,
    overallPowerScore: p.overallPowerScore,
    rank: idx + 1
  }));

  console.log(`\nEra: ${eraName} (${eraPres.length} presidents)`);
  eraRankings[eraName].slice(0, 3).forEach(r => console.log(`  ${r.rank}. ${r.name} — ${r.overallPowerScore}`));
  if (eraRankings[eraName].length > 3) {
    const last = eraRankings[eraName][eraRankings[eraName].length - 1];
    console.log(`  ... ${last.rank}. ${last.name} — ${last.overallPowerScore}`);
  }
});

updatedPresidents.forEach(p => { p.eraRankings = eraRankings; });

// Save updated file
fs.writeFileSync(RANKINGS_PATH, JSON.stringify(updatedPresidents, null, 2));

console.log(`\n✅ Rubric scoring complete. Updated ${updatedPresidents.length} presidents.`);
console.log("   → Severity & effectiveness now approximated");
console.log("   → overallPowerScore should be non-zero for most presidents");
