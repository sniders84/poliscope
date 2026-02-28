// scripts/merge-presidents.js
// Merge metric JSON files into presidents-rankings.json
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PUBLIC = p => path.join(ROOT, 'public', p);
const RANKINGS_PATH = PUBLIC('presidents-rankings.json');

const FILES = {
  crisisManagement: PUBLIC('presidents-crisis-management.json'),
  domesticPolicy: PUBLIC('presidents-domestic-policy.json'),
  economicPolicy: PUBLIC('presidents-economic-policy.json'),
  foreignPolicy: PUBLIC('presidents-foreign-policy.json'),
  judicialPolicy: PUBLIC('presidents-judicial-policy.json'),
  legislation: PUBLIC('presidents-legislation.json'),
  misconduct: PUBLIC('presidents-misconduct.json')
};

function loadJson(pathname) {
  try {
    const raw = fs.readFileSync(pathname, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Failed to load ${pathname}:`, err.message);
    return {};
  }
}

function indexById(data) {
  const map = new Map();
  if (Array.isArray(data)) {
    data.forEach(item => {
      if (item && item.id) map.set(item.id, item);
    });
  } else if (typeof data === 'object' && data !== null) {
    Object.values(data).forEach(item => {
      if (item && item.id) map.set(item.id, item);
    });
  }
  return map;
}

function main() {
  console.log('merge-presidents: starting merge');

  const rankingsData = loadJson(RANKINGS_PATH);
  if (Object.keys(rankingsData).length === 0) {
    console.error('No data found in presidents-rankings.json');
    return;
  }

  // Normalize to array for easier processing
  const rankings = Array.isArray(rankingsData)
    ? rankingsData
    : Object.values(rankingsData);

  // Index rankings by ID
  const rankingsById = indexById(rankings);

  // Load and index all metric files
  const metricsData = {};
  for (const [key, filePath] of Object.entries(FILES)) {
    const raw = loadJson(filePath);
    metricsData[key] = indexById(raw);
    console.log(`Loaded ${key}: ${metricsData[key].size} entries`);
  }

  // Merge metrics into each president entry
  rankings.forEach(p => {
    const id = p.id;
    if (!id) return;

    // Ensure metrics object exists
    if (!p.metrics || typeof p.metrics !== 'object') {
      p.metrics = {};
    }

    // Assign each category if present
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

  // Save back as array (scores script expects array)
  fs.writeFileSync(RANKINGS_PATH, JSON.stringify(rankings, null, 2), 'utf8');
  console.log(`merge-presidents: merged metrics into ${rankings.length} presidents and saved to ${RANKINGS_PATH}`);
}

if (require.main === module) {
  main();
}

module.exports = { main };
