// scripts/presidents-scores.js
// Compute metric scores from narrative metrics, then powerScore, eraNormalizedScore, and rank

const fs = require('fs');
const path = require('path');
const eras = require('./presidential-eras');

const ROOT = path.join(__dirname, '..');
const RANKINGS_PATH = path.join(ROOT, 'public', 'presidents-rankings.json');

// Weights for composite powerScore
const METRIC_WEIGHTS = {
  crisisManagement: 1.4,
  domesticPolicy: 1.2,
  economicPolicy: 1.3,
  foreignPolicy: 1.2,
  judicialPolicy: 1.0,
  legislation: 1.1,
  misconduct: 1.3 // positive weight; score already penalizes misconduct
};

function loadRankings() {
  const raw = fs.readFileSync(RANKINGS_PATH, 'utf8');
  return JSON.parse(raw);
}

// Generic event counter: counts objects in arrays and walks nested structures
function countEvents(root) {
  let count = 0;

  function walk(node) {
    if (!node) return;

    if (Array.isArray(node)) {
      node.forEach(el => {
        if (el && typeof el === 'object') {
          count += 1;      // each array element = one event
          walk(el);        // also walk nested content
        }
      });
    } else if (node && typeof node === 'object') {
      Object.values(node).forEach(v => walk(v));
    }
  }

  walk(root);
  return count;
}

// First pass: compute raw event counts and track max per category
function computeRawCounts(presidents) {
  const maxCounts = {
    crisisManagement: 0,
    domesticPolicy: 0,
    economicPolicy: 0,
    foreignPolicy: 0,
    judicialPolicy: 0,
    legislation: 0,
    misconduct: 0
  };

  presidents.forEach(p => {
    const m = p.metrics || {};

    const crisisManagement = countEvents(m.crisisManagement);
    const domesticPolicy = countEvents(m.domesticPolicy);
    const economicPolicy = countEvents(m.economicPolicy);
    const foreignPolicy = countEvents(m.foreignPolicy);
    const judicialPolicy = countEvents(m.judicialPolicy);
    const legislation = countEvents(m.legislation);
    const misconduct = countEvents(m.misconduct);

    p._rawCounts = {
      crisisManagement,
      domesticPolicy,
      economicPolicy,
      foreignPolicy,
      judicialPolicy,
      legislation,
      misconduct
    };

    Object.keys(maxCounts).forEach(key => {
      if (p._rawCounts[key] > maxCounts[key]) {
        maxCounts[key] = p._rawCounts[key];
      }
    });
  });

  return maxCounts;
}

function normalizeCount(count, max) {
  if (!max || max <= 0) return 0;
  const score = (count / max) * 10;
  return score > 10 ? 10 : score;
}

// Second pass: convert raw counts into 0–10 scores
function applyNarrativeScores(presidents, maxCounts) {
  presidents.forEach(p => {
    const rc = p._rawCounts || {};

    const crisisManagement = normalizeCount(rc.crisisManagement || 0, maxCounts.crisisManagement);
    const domesticPolicy = normalizeCount(rc.domesticPolicy || 0, maxCounts.domesticPolicy);
    const economicPolicy = normalizeCount(rc.economicPolicy || 0, maxCounts.economicPolicy);
    const foreignPolicy = normalizeCount(rc.foreignPolicy || 0, maxCounts.foreignPolicy);
    const judicialPolicy = normalizeCount(rc.judicialPolicy || 0, maxCounts.judicialPolicy);
    const legislation = normalizeCount(rc.legislation || 0, maxCounts.legislation);

    // Misconduct: more events → lower score; no misconduct → 10
    let misconduct;
    if (maxCounts.misconduct <= 0) {
      misconduct = 10;
    } else {
      const rawMis = normalizeCount(rc.misconduct || 0, maxCounts.misconduct);
      misconduct = 10 - rawMis;
      if (misconduct < 0) misconduct = 0;
    }

    if (!p.scores) p.scores = {};

    p.scores.crisisManagement = crisisManagement;
    p.scores.domesticPolicy = domesticPolicy;
    p.scores.economicPolicy = economicPolicy;
    p.scores.foreignPolicy = foreignPolicy;
    p.scores.judicialPolicy = judicialPolicy;
    p.scores.legislation = legislation;
    p.scores.misconduct = misconduct;
  });

  // Clean up temp raw counts
  presidents.forEach(p => {
    delete p._rawCounts;
  });
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

  for (const list of Object.values(byEra)) {
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

  // 1) Compute raw narrative event counts and max per category
  const maxCounts = computeRawCounts(rankings);

  // 2) Convert narrative counts into 0–10 scores
  applyNarrativeScores(rankings, maxCounts);

  // 3) Compute powerScore for each president
  rankings.forEach(p => {
    p.scores.powerScore = computePowerScore(p.scores);
  });

  // 4) Compute era-normalized scores
  computeEraNormalizedScores(rankings, eraMap);

  // 5) Rank by powerScore (desc)
  const sorted = [...rankings].sort((a, b) => b.scores.powerScore - a.scores.powerScore);
  sorted.forEach((p, idx) => {
    p.scores.rank = idx + 1;
  });

  // 6) Write back in original id order but with updated scores
  const byId = new Map(sorted.map(p => [p.id, p]));
  const final = rankings.map(p => byId.get(p.id));

  fs.writeFileSync(RANKINGS_PATH, JSON.stringify(final, null, 2), 'utf8');
  console.log('presidents-scores: computed narrative-based scores, powerScore, eraNormalizedScore, and rank');
}

main();
