// scripts/merge-presidents.js
// Merge metric JSON files into presidents-rankings.json

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA = p => path.join(ROOT, 'data', p);

const RANKINGS_PATH = DATA('presidents-rankings.json');

const FILES = {
  crisisManagement: DATA('presidents-crisis-management.json'),
  domesticPolicy: DATA('presidents-domestic-policy.json'),
  economicPolicy: DATA('presidents-economic-policy.json'),
  foreignPolicy: DATA('presidents-foreign-policy.json'),
  judicialPolicy: DATA('presidents-judicial-policy.json'),
  legislation: DATA('presidents-legislation.json'),
  misconduct: DATA('presidents-misconduct.json')
};

function loadJson(pathname) {
  const raw = fs.readFileSync(pathname, 'utf8');
  return JSON.parse(raw);
}

function indexById(arr) {
  const map = new Map();
  arr.forEach(item => map.set(item.id, item));
  return map;
}

function main() {
  const rankings = loadJson(RANKINGS_PATH);
  const rankingsById = indexById(rankings);

  const metricsData = {};
  for (const [key, filePath] of Object.entries(FILES)) {
    metricsData[key] = indexById(loadJson(filePath));
  }

  rankings.forEach(p => {
    const id = p.id;

    if (metricsData.crisisManagement.has(id)) {
      p.metrics.crisisManagement = metricsData.crisisManagement.get(id).crisisManagement;
    }
    if (metricsData.domesticPolicy.has(id)) {
      p.metrics.domesticPolicy = metricsData.domesticPolicy.get(id).domesticPolicy;
    }
    if (metricsData.economicPolicy.has(id)) {
      p.metrics.economicPolicy = metricsData.economicPolicy.get(id).economicPolicy;
    }
    if (metricsData.foreignPolicy.has(id)) {
      p.metrics.foreignPolicy = metricsData.foreignPolicy.get(id).foreignPolicy;
    }
    if (metricsData.judicialPolicy.has(id)) {
      p.metrics.judicialPolicy = metricsData.judicialPolicy.get(id).judicialPolicy;
    }
    if (metricsData.legislation.has(id)) {
      p.metrics.legislation = metricsData.legislation.get(id).legislation;
    }
    if (metricsData.misconduct.has(id)) {
      p.metrics.misconduct = metricsData.misconduct.get(id).misconduct;
    }
  });

  fs.writeFileSync(RANKINGS_PATH, JSON.stringify(rankings, null, 2), 'utf8');
  console.log('merge-presidents: merged metrics into presidents-rankings.json');
}

main();
