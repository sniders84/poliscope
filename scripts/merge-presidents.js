// scripts/merge-presidents.js
// Merge metric JSON files into presidents-rankings.json using the new hybrid schema.

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

function indexById(arr) {
  const map = new Map();
  if (Array.isArray(arr)) {
    arr.forEach(item => {
      if (item && item.id) map.set(item.id, item);
    });
  }
  return map;
}

function extractHybridFields(categoryObj) {
  if (!categoryObj) return null;

  return {
    overview: categoryObj.overview || categoryObj[`${categoryObj.key}Overview`] || "",
    eventCount: categoryObj.eventCount || 0,
    impactScore: categoryObj.impactScore || 0,
    significanceScore: categoryObj.significanceScore || 0,
    majorEvents: categoryObj.majorEvents || [],
    minorEvents: categoryObj.minorEvents || [],
    subcategories: categoryObj.subcategories || {}
  };
}

function main() {
  console.log('merge-presidents: starting merge');

  const rankings = loadJson(RANKINGS_PATH);
  if (!Array.isArray(rankings)) {
    console.error('presidents-rankings.json is not an array.');
    return;
  }

  const metricsData = {};
  for (const [key, filePath] of Object.entries(FILES)) {
    const raw = loadJson(filePath);
    metricsData[key] = indexById(raw);
    console.log(`Loaded ${key}: ${metricsData[key].size} entries`);
  }

  rankings.forEach(p => {
    const id = p.id;
    if (!id) return;

    // Remove old schema fields
    delete p.metrics;
    delete p.events;
    delete p.scores;

    // Create new hybrid category containers
    p.crisisManagement = {};
    p.domesticPolicy = {};
    p.economicPolicy = {};
    p.foreignPolicy = {};
    p.judicialPolicy = {};
    p.legislation = {};
    p.misconduct = {};

    // Assign hybrid fields for each category
    for (const category of Object.keys(FILES)) {
      if (metricsData[category].has(id)) {
        const rawCategory = metricsData[category].get(id)[category];
        p[category] = extractHybridFields(rawCategory);
      }
    }
  });

  fs.writeFileSync(RANKINGS_PATH, JSON.stringify(rankings, null, 2), 'utf8');
  console.log(`merge-presidents: merged hybrid metrics into ${rankings.length} presidents and saved to ${RANKINGS_PATH}`);
}

if (require.main === module) {
  main();
}

module.exports = { main };
