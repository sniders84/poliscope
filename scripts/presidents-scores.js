// scripts/presidents-scores.js

const fs = require("fs");
const path = require("path");
const ERAS = require("./presidential-eras");

const PUBLIC_DIR = path.join(__dirname, "..", "public");
const INPUT_FILE = path.join(PUBLIC_DIR, "presidents-rankings.json");
const OUTPUT_FILE = path.join(PUBLIC_DIR, "presidents-rankings.json");

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

  return {
    crisisManagementScore: scorePositiveMetric(m.crisisManagement),
    foreignPolicyScore: scorePositiveMetric(m.foreignPolicy),
    domesticPolicyScore: scorePositiveMetric(m.domesticPolicy),
    economicPolicyScore: scorePositiveMetric(m.economicPolicy),
    judicialPolicyScore: scorePositiveMetric(m.judicialPolicy),
    legislationScore: scorePositiveMetric(m.legislation),
    misconductScore: scoreMisconduct(m.misconduct)
  };
}

function normalizeEraScores(presidents) {
  const values = presidents.map(p => p.rawComposite);
  const min = Math.min(...values);
  const max = Math.max(...values);

  presidents.forEach(p => {
    p.normalized = max === min ? 50 : ((p.rawComposite - min) / (max - min)) * 100;
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
      const rawComposite = Object.entries(raw).reduce(
        (sum, [key, val]) => sum + val * WEIGHTS[key],
        0
      );

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
