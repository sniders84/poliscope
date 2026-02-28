// scripts/presidents-scores.js
// Recompute scores in public/presidents-rankings.json using era-normalized event counts
// based on the nested metrics.* trees.

const fs = require('fs');
const path = require('path');
const eras = require('./presidential-eras');

// ---- CONFIG ----

const ROOT = path.join(__dirname, '..');
const INPUT_FILE = path.join(ROOT, 'public', 'presidents-rankings.json');
const OUTPUT_FILE = INPUT_FILE;

// Categories as they appear under metrics
const CATEGORIES = [
  'crisisManagement',
  'domesticPolicy',
  'economicPolicy',
  'foreignPolicy',
  'judicialPolicy',
  'legislation',
  'misconduct'
];

// Weights for overall powerScore (should sum ~1.0)
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

// Recursively count "event objects" in a metrics subtree.
function countEvents(node) {
  if (!node || typeof node !== 'object') return 0;

  // If this looks like a leaf event, count as 1
  if (
    !Array.isArray(node) &&
    (node.title || node.name || node.summary || node.description)
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

// Build a map: era -> { category -> { min, max } }
function buildEraCategoryStats(presidents) {
  const stats = {};

  for (const pres of presidents) {
    const era = pres.era || getEraForPresidentId(pres.id);
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

// Normalize a raw count to 0–10 within an era
function normalizeCountToScore(rawCount, eraStatsForEra, category) {
  const stats = eraStatsForEra && eraStatsForEra[category];
  if (!stats) return 5.0;

  const { min, max } = stats;
  if (min === max) return 5.0;

  const normalized = (rawCount - min) / (max - min);
  return +(normalized * 10).toFixed(2);
}

// Generate hybrid summary
function generateCategorySummary(president, category, score, eraStats, presidentsInEra) {
  const name = president.name || `President #${president.id}`;
  const era = president.era || 'their era';
  const rawCount = president._rawEventCounts[category] || 0;
  const statsForEra = eraStats[era] || {};
  const stats = statsForEra[category];

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
  const eraNormalizedScore = +base.toFixed(2); // 0–10

  return { powerScore, eraNormalizedScore };
}

// ---- MAIN PIPELINE ----

function buildRankings() {
  // Load file (may be array OR object)
  const data = loadJson(INPUT_FILE);

  // Normalize to array
  const presidents = Array.isArray(data) ? data : Object.values(data);

  // Attach era and raw event counts
  for (const pres of presidents) {
    pres.era = pres.era || getEraForPresidentId(pres.id);

    pres._rawEventCounts = {};
    for (const category of CATEGORIES) {
      const metricsRoot =
        pres.metrics && pres.metrics[category] ? pres.metrics[category] : null;
      pres._rawEventCounts[category] = countEvents(metricsRoot);
    }
  }

  // Build era/category stats
  const eraStats = buildEraCategoryStats(presidents);

  // Build helper: presidents per era
  const presidentsInEra = {};
  for (const pres of presidents) {
    const era = pres.era || 'unknown';
    if (!presidentsInEra[era]) presidentsInEra[era] = [];
    presidentsInEra[era].push(pres);
  }

  // Compute category scores, summaries, and overall scores
  for (const pres of presidents) {
    const era = pres.era;
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

    pres.scores = {
      ...pres.scores,
      ...categoryScores,
      powerScore,
      eraNormalizedScore
    };

    pres.summaries = summaries;
  }

  // Rank presidents
  presidents.sort((a, b) => {
    if (b.scores.powerScore !== a.scores.powerScore) {
      return b.scores.powerScore - a.scores.powerScore;
    }
    if (b.scores.eraNormalizedScore !== a.scores.eraNormalizedScore) {
      return b.scores.eraNormalizedScore - a.scores.eraNormalizedScore;
    }
    return a.id - b.id;
  });

  presidents.forEach((pres, index) => {
    pres.scores.rank = index + 1;
    delete pres._rawEventCounts;
  });

  // Save back as ARRAY
  saveJson(OUTPUT_FILE, presidents);
}

// Run if executed directly
if (require.main === module) {
  buildRankings();
}

module.exports = {
  buildRankings
};
