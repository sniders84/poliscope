// scripts/presidents-scores.js
// Compute metric scores, powerScore, eraNormalizedScore, and rank

const fs = require('fs');
const path = require('path');
const eras = require('./presidential-eras');

const ROOT = path.join(__dirname, '..');
const RANKINGS_PATH = path.join(ROOT, 'data', 'presidents-rankings.json');

// Adjust these weights as you refine philosophy
const METRIC_WEIGHTS = {
  crisisManagement: 1.4,
  domesticPolicy: 1.2,
  economicPolicy: 1.3,
  foreignPolicy: 1.2,
  judicialPolicy: 1.0,
  legislation: 1.1,
  misconduct: -1.3 // negative weight
};

function loadRankings() {
  const raw = fs.readFileSync(RANKINGS_PATH, 'utf8');
  return JSON.parse(raw);
}

function computePowerScore(scores) {
  let num = 0;
  let den = 0;

  for (const [metric, weight] of Object.entries(METRIC_WEIGHTS)) {
    const value = scores[metric] || 0;
    num += value * weight;
    den += Math.abs(weight);
  }

  return den === 0 ? 0 : num / den;
}

function buildEraMap() {
  const map = new Map();
  for (const [eraName, ids] of Object.entries(eras)) {
    ids.forEach(id => map.set(id, eraName));
  }
  return map;
}

function computeEraNormalizedScores(presidents, eraMap) {
  const byEra = {};
  presidents.forEach(p => {
    const era = eraMap.get(p.id) || 'unknown';
    if (!byEra[era]) byEra[era] = [];
    byEra[era].push(p);
  });

  for (const [era, list] of Object.entries(byEra)) {
    const scores = list.map(p => p.scores.powerScore);
    const mean = scores.reduce((a, b) => a + b, 0) / (scores.length || 1);
    const variance =
      scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (scores.length || 1);
    const std = Math.sqrt(variance) || 1;

    list.forEach(p => {
      p.scores.eraNormalizedScore = (p.scores.powerScore - mean) / std;
    });
  }
}

function main() {
  const rankings = loadRankings();
  const eraMap = buildEraMap();

  // 1) Compute powerScore for each president
  rankings.forEach(p => {
    p.scores.powerScore = computePowerScore(p.scores);
  });

  // 2) Compute era-normalized scores
  computeEraNormalizedScores(rankings, eraMap);

  // 3) Rank by powerScore (desc)
  const sorted = [...rankings].sort((a, b) => b.scores.powerScore - a.scores.powerScore);
  sorted.forEach((p, idx) => {
    p.scores.rank = idx + 1;
  });

  // Write back in original id order but with updated scores
  const byId = new Map(sorted.map(p => [p.id, p]));
  const final = rankings.map(p => byId.get(p.id));

  fs.writeFileSync(RANKINGS_PATH, JSON.stringify(final, null, 2), 'utf8');
  console.log('presidents-scores: computed powerScore, eraNormalizedScore, and rank');
}

main();
