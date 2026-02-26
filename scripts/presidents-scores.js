// scripts/presidents-scores.js

const fs = require("fs");
const path = require("path");

const PUBLIC_DIR = path.join(__dirname, "..", "public");
const INPUT_FILE = path.join(PUBLIC_DIR, "presidents-rankings.json");
const OUTPUT_FILE = path.join(PUBLIC_DIR, "presidents-rankings.json");

// Weights for final powerScore
const WEIGHTS = {
  crisisManagementScore: 0.20,
  foreignPolicyScore: 0.15,
  domesticPolicyScore: 0.15,
  economicPolicyScore: 0.15,
  judicialPolicyScore: 0.10,
  legislationScore: 0.15,
  misconductScore: 0.10
};

// Event severity scoring
const POSITIVE_EVENT_VALUE = 10; // +10 for each positive event
const NEGATIVE_EVENT_VALUE = 10; // -10 for each negative event

// Misconduct severity scoring
const MISCONDUCT_VALUE = 10; // each misconduct event subtracts 10 from 100

function clamp(num, min, max) {
  return Math.min(Math.max(num, min), max);
}

function scorePositiveMetric(metric) {
  if (!metric || !metric.events) return 50;

  let score = 50;

  for (const event of metric.events) {
    const summary = event.summary.toLowerCase();

    // crude but effective sentiment check
    const negativeKeywords = ["crisis", "controversy", "failure", "violence", "fraud", "scandal", "abuse", "mismanagement", "disaster"];
    const positiveKeywords = ["success", "reform", "improvement", "strengthened", "expanded", "protected"];

    const isNegative = negativeKeywords.some(k => summary.includes(k));
    const isPositive = positiveKeywords.some(k => summary.includes(k));

    if (isPositive) score += POSITIVE_EVENT_VALUE;
    if (isNegative) score -= NEGATIVE_EVENT_VALUE;
  }

  return clamp(score, 0, 100);
}

function scoreMisconduct(metric) {
  if (!metric || !metric.events) return 100;

  let score = 100;

  for (const event of metric.events) {
    score -= MISCONDUCT_VALUE;
  }

  return clamp(score, 0, 100);
}

function computePowerScore(scores) {
  let total = 0;

  for (const [key, weight] of Object.entries(WEIGHTS)) {
    total += (scores[key] || 0) * weight;
  }

  return Math.round(total);
}

function main() {
  const data = JSON.parse(fs.readFileSync(INPUT_FILE, "utf8"));

  const scored = data.map((president) => {
    const m = president.metrics;

    const crisisManagementScore = scorePositiveMetric(m.crisisManagement);
    const foreignPolicyScore = scorePositiveMetric(m.foreignPolicy);
    const domesticPolicyScore = scorePositiveMetric(m.domesticPolicy);
    const economicPolicyScore = scorePositiveMetric(m.economicPolicy);
    const judicialPolicyScore = scorePositiveMetric(m.judicialPolicy);
    const legislationScore = scorePositiveMetric(m.legislation);
    const misconductScore = scoreMisconduct(m.misconduct);

    const scores = {
      crisisManagementScore,
      foreignPolicyScore,
      domesticPolicyScore,
      economicPolicyScore,
      judicialPolicyScore,
      legislationScore,
      misconductScore,
      powerScore: computePowerScore({
        crisisManagementScore,
        foreignPolicyScore,
        domesticPolicyScore,
        economicPolicyScore,
        judicialPolicyScore,
        legislationScore,
        misconductScore
      })
    };

    president.scores = scores;
    return president;
  });

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(scored, null, 2), "utf8");
  console.log(`Presidential scores computed → ${OUTPUT_FILE}`);
}

main();
