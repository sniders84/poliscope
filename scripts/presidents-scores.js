// presidents-scores.js
// Builds presidents-rankings.json from presidents-bootstrap.json using era-normalized event counts
// and generates simple hybrid neutral-analytical summaries per category.

const fs = require('fs');
const path = require('path');
const eras = require('./presidential-eras');

// ---- CONFIG ----

const INPUT_FILE = path.join(__dirname, 'presidents-bootstrap.json');
const OUTPUT_FILE = path.join(__dirname, 'presidents-rankings.json');

// Categories expected in presidents-bootstrap.json
const CATEGORIES = [
  'crisisManagement',
  'domesticPolicy',
  'economicPolicy',
  'foreignPolicy',
  'judicialPolicy',
  'legislation',
  'misconduct'
];

// Weights for overall powerScore (must sum to 1.0 ideally)
const CATEGORY_WEIGHTS = {
  crisisManagement: 0.18,
  domesticPolicy: 0.17,
  economicPolicy: 0.17,
  foreignPolicy: 0.17,
  judicialPolicy: 0.12,
  legislation: 0.12,
  misconduct: 0.07
};

// ---- UTILITIES ----

function loadJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function saveJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function getEraForPresidentId(id) {
  const pid = Number(id);
  for (const [eraName, ids] of Object.entries(eras)) {
    if (ids.includes(pid)) return eraName;
  }
  return 'unknown';
}

// Recursively count "event objects" in a category tree.
// Assumes events are objects inside arrays or nested objects.
function countEvents(node) {
  if (!node || typeof node !== 'object') return 0;

  // If this looks like a leaf event (has title/description/date/etc.), count as 1
  if (
    !Array.isArray(node) &&
    (node.title || node.name || node.description || node.summary || node.date)
  ) {
    return 1;
  }

  let count = 0;

  if (Array.isArray(node)) {
    for (const item of node) {
      count += countEvents(item);
    }
  } else {
    for (const value of Object.values(node)) {
      count += countEvents(value);
    }
  }

  return count;
}

// Build a map: era -> { category -> { min, max } } based on raw event counts
function buildEraCategoryStats(presidents) {
  const stats = {};

  for (const [id, pres] of Object.entries(presidents)) {
    const era = pres.era || getEraForPresidentId(id);
    if (!stats[era]) stats[era] = {};

    for (const category of CATEGORIES) {
      const rawCount = pres._rawEventCounts[category] || 0;
      if (!stats[era][category]) {
        stats[era][category] = { min: rawCount, max: rawCount };
      } else {
        stats[era][category].min = Math.min(stats[era][category].min, rawCount);
        stats[era][category].max = Math.max(stats[era][category].max, rawCount);
      }
    }
  }

  return stats;
}

// Normalize a raw count to 0–10 within an era for a given category
function normalizeCountToScore(rawCount, eraStats, category) {
  const stats = eraStats[category];
  if (!stats) return 5.0; // fallback neutral

  const { min, max } = stats;
  if (min === max) return 5.0; // everyone same -> neutral

  const normalized = (rawCount - min) / (max - min);
  return +(normalized * 10).toFixed(2);
}

// Generate a simple hybrid neutral-analytical summary for a category
function generateCategorySummary(president, category, score, eraStats, presidentsInEra) {
  const name = president.name || `President #${president.id}`;
  const era = president.era || 'their era';
  const rawCount = president._rawEventCounts[category] || 0;
  const stats = eraStats[era] && eraStats[era][category];

  let relativePhrase = 'a typical level of activity compared with others in the same era';
  if (stats && stats.max !== stats.min) {
    const normalized = (rawCount - stats.min) / (stats.max - stats.min);
    if (normalized >= 0.75) {
      relativePhrase = 'a comparatively high level of activity within their era';
    } else if (normalized <= 0.25) {
      relativePhrase = 'a comparatively limited level of activity within their era';
    }
  }

  const categoryLabelMap = {
    crisisManagement: 'crisis management',
    domesticPolicy: 'domestic policy',
    economicPolicy: 'economic policy',
    foreignPolicy: 'foreign policy',
    judicialPolicy: 'judicial and constitutional policy',
    legislation: 'legislative leadership',
    misconduct: 'ethical and legal misconduct'
  };

  const label = categoryLabelMap[category] || category;

  const eraPresidents = presidentsInEra[era] || [];
  const eraCount = eraPresidents.length || 1;

  return [
    `${name}'s ${label} score reflects the number and significance of recorded events in this area during their time in office.`,
    `In this category, they show ${relativePhrase}, based on how their event count compares with approximately ${eraCount} presidents in the ${era} era.`,
    `The ${label} score of ${score.toFixed(1)} out of 10 is derived from an era-normalized comparison of event density rather than a simple raw total.`,
    `This approach is designed to account for differences in historical context, institutional capacity, and the volume of available records across eras.`,
    `Overall, the score situates ${name} as ${relativePhrase.replace('a ', '')} when evaluated against peers facing broadly similar structural and historical conditions.`
  ].join(' ');
}

// Compute weighted powerScore and eraNormalizedScore
function computeOverallScores(categoryScores) {
  let weightedSum = 0;
  let weightTotal = 0;

  for (const [category, score] of Object.entries(categoryScores)) {
    const w = CATEGORY_WEIGHTS[category] || 0;
    weightedSum += score * w;
    weightTotal += w;
  }

  if (weightTotal === 0) return { powerScore: 0, eraNormalizedScore: 0 };

  const base = weightedSum / weightTotal; // 0–10
  const powerScore = +(base * 10).toFixed(2); // 0–100
  const eraNormalizedScore = +base.toFixed(2); // keep 0–10 as well

  return { powerScore, eraNormalizedScore };
}

// ---- MAIN PIPELINE ----

function buildRankings() {
  const bootstrap = loadJson(INPUT_FILE);

  // Expect bootstrap as object keyed by president id
  // If it's an array, convert to object keyed by id
  let presidents = {};
  if (Array.isArray(bootstrap)) {
    for (const p of bootstrap) {
      if (!p.id) continue;
      presidents[String(p.id)] = p;
    }
  } else {
    presidents = bootstrap;
  }

  // Attach era and raw event counts
  for (const [id, pres] of Object.entries(presidents)) {
    pres.id = pres.id || Number(id);
    pres.era = pres.era || getEraForPresidentId(id);

    pres._rawEventCounts = {};
    for (const category of CATEGORIES) {
      const node = pres[category] || {};
      pres._rawEventCounts[category] = countEvents(node);
    }
  }

  // Build era/category stats
  const eraStats = buildEraCategoryStats(presidents);

  // Build helper: presidents per era
  const presidentsInEra = {};
  for (const [id, pres] of Object.entries(presidents)) {
    const era = pres.era || 'unknown';
    if (!presidentsInEra[era]) presidentsInEra[era] = [];
    presidentsInEra[era].push(pres);
  }

  // Compute category scores, summaries, and overall scores
  for (const [id, pres] of Object.entries(presidents)) {
    const era = pres.era || getEraForPresidentId(id);
    const categoryScores = {};
    const summaries = {};

    for (const category of CATEGORIES) {
      const rawCount = pres._rawEventCounts[category] || 0;
      const score = normalizeCountToScore(rawCount, eraStats[era] || {}, category);
      categoryScores[category] = score;

      summaries[category] = generateCategorySummary(
        pres,
        category,
        score,
        eraStats,
        presidentsInEra
      );
    }

    const { powerScore, eraNormalizedScore } = computeOverallScores(categoryScores);

    pres.scores = categoryScores;
    pres.summaries = summaries;
    pres.powerScore = powerScore;
    pres.eraNormalizedScore = eraNormalizedScore;
  }

  // Rank presidents by powerScore (desc), tie-breaker: eraNormalizedScore, then id
  const sorted = Object.values(presidents).sort((a, b) => {
    if (b.powerScore !== a.powerScore) return b.powerScore - a.powerScore;
    if (b.eraNormalizedScore !== a.eraNormalizedScore) {
      return b.eraNormalizedScore - a.eraNormalizedScore;
    }
    return a.id - b.id;
  });

  sorted.forEach((pres, index) => {
    pres.rank = index + 1;
  });

  // Rebuild object keyed by id for output
  const output = {};
  for (const pres of sorted) {
    const id = String(pres.id);
    // Remove internal helper
    delete pres._rawEventCounts;
    output[id] = pres;
  }

  saveJson(OUTPUT_FILE, output);
}

// Run if executed directly
if (require.main === module) {
  buildRankings();
}

module.exports = {
  buildRankings
};
