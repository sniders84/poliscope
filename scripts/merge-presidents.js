// scripts/merge-presidents.js
// Merge metric JSON files into presidents-rankings.json using the unified hybrid schema.

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const PUBLIC = p => path.join(ROOT, "public", p);
const RANKINGS_PATH = PUBLIC("presidents-rankings.json");

const FILES = {
  crisisManagement: PUBLIC("presidents-crisis-management.json"),
  domesticPolicy: PUBLIC("presidents-domestic-policy.json"),
  economicPolicy: PUBLIC("presidents-economic-policy.json"),
  foreignPolicy: PUBLIC("presidents-foreign-policy.json"),
  judicialPolicy: PUBLIC("presidents-judicial-policy.json"),
  legislation: PUBLIC("presidents-legislation.json"),
  misconduct: PUBLIC("presidents-misconduct.json")
};

function loadJson(pathname) {
  try {
    return JSON.parse(fs.readFileSync(pathname, "utf8"));
  } catch {
    return [];
  }
}

function indexById(arr) {
  const map = new Map();
  arr.forEach(item => {
    if (item && item.id) map.set(item.id, item);
  });
  return map;
}

function extractHybridFields(raw) {
  if (!raw) return {};

  return {
    overview: raw.overview || "",
    eventCount: raw.eventCount || 0,
    impactScore: raw.impactScore || 0,
    significanceScore: raw.significanceScore || 0,
    majorEvents: raw.majorEvents || [],
    minorEvents: raw.minorEvents || [],
    subcategories: raw.subcategories || {}
  };
}

function main() {
  console.log("merge-presidents: starting merge");

  const rankings = loadJson(RANKINGS_PATH);
  if (!Array.isArray(rankings)) {
    console.error("presidents-rankings.json is not an array.");
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

    for (const category of Object.keys(FILES)) {
      if (metricsData[category].has(id)) {
        const rawCategory = metricsData[category].get(id)[category];
        const hybrid = extractHybridFields(rawCategory);

        // Merge into existing hybrid structure from bootstrap
        p[category] = {
          ...p[category],
          ...hybrid
        };
      }
    }
  });

  fs.writeFileSync(RANKINGS_PATH, JSON.stringify(rankings, null, 2));
  console.log(`merge-presidents: merged hybrid metrics into ${rankings.length} presidents`);
}

main();
