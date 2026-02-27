// scripts/presidents-scores.js

const fs = require("fs");
const path = require("path");

const PUBLIC_DIR = path.join(__dirname, "..", "public");
const INPUT_FILE = path.join(PUBLIC_DIR, "presidents-rankings.json");
const OUTPUT_FILE = path.join(PUBLIC_DIR, "presidents-rankings.json");

// Era groupings
const ERAS = {
  founding: [1, 2, 3, 4, 5],
  antebellum: [6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
  civilWar: [16, 17, 18, 19],
  industrial: [20, 21, 22, 23, 24, 25],
  progressive: [26, 27, 28, 29, 30, 31],
  depressionWWII: [32, 33],
  coldWar: [34, 35, 36, 37, 38, 39, 40, 41],
  postColdWar: [42, 43, 44, 45, 46]
};

// Metric weights
const WEIGHTS = {
  crisisManagementScore: 0.20,
  foreignPolicyScore: 0.15,
  domesticPolicyScore: 0.15,
  economicPolicyScore: 0.15,
  judicialPolicyScore: 0.10,
  legislationScore: 0.15,
  misconductScore: 0.10
};

function clamp(n, min, max) {
  return Math.min(Math.max(n, min), max);
}

// Positive/negative event scoring
function scorePositiveMetric(metric) {
  if (!metric || !metric.events) return 50;

  let score = 50;

  for (const event of metric.events) {
    const text = event.summary.toLowerCase();
    const negative = ["crisis", "failure", "violence", "scandal", "abuse", "disaster"];
    const positive = ["success", "reform", "improvement", "strengthened", "protected"];

    if (positive.some(k => text.includes(k))) score += 10;
    if (negative.some(k => text.includes(k))) score -= 10;
  }

  return clamp(score, 0, 100);
}

function scoreMisconduct(metric) {
  if (!metric || !metric.events) return 100;
  return clamp(100 - metric.events.length * 10, 0, 100);
}

function computeRawScores(p) {
  const m = p.metrics;

  const crisisManagementScore = scorePositiveMetric(m.crisisManagement);
  const foreignPolicyScore = scorePositiveMetric(m.foreignPolicy);
  const domesticPolicyScore = scorePositiveMetric(m.domesticPolicy);
  const economicPolicyScore = scorePositiveMetric(m.economicPolicy);
  const judicialPolicyScore = scorePositiveMetric(m.judicialPolicy);
  const legislationScore = scorePositiveMetric(m.legislation);
  const misconductScore = scoreMisconduct(m.misconduct);

  return {
    crisisManagementScore,
    foreignPolicyScore,
    domesticPolicyScore,
    economicPolicyScore,
    judicialPolicyScore,
    legislationScore,
    misconductScore
  };
}

function normalizeEraScores(presidents) {
  const values = presidents.map(p => p.rawComposite);
  const min = Math.min(...values);
  const max = Math.max(...values);

  presidents.forEach(p => {
    if (max === min) {
      p.normalized = 50;
    } else {
      p.normalized = ((p.rawComposite - min) / (max - min)) * 100;
    }
  });
}

function main() {
  const data = JSON.parse(fs.readFileSync(INPUT_FILE, "utf8"));

  const eraBuckets = {};
  for (const [era, ids] of Object.entries(ERAS)) {
    eraBuckets[era] = data.filter(p => ids.includes(p.id));
  }

  for (const [era, presidents] of Object.entries(eraBuckets)) {
    presidents.forEach(p => {
      const raw = computeRawScores(p);
      const rawComposite = Object.entries(raw).reduce((sum, [key, val]) => sum + val * WEIGHTS[key], 0);

      p.rawScores = raw;
      p.rawComposite = rawComposite;
    });

    normalizeEraScores(presidents);

    presidents.forEach(p => {
      p.scores = {
        ...p.rawScores,
        powerScore: Math.round(p.normalized)
      };
    });
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(data, null, 2), "utf8");
  console.log(`Presidential scores computed → ${OUTPUT_FILE}`);
}

main();
