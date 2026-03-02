// scripts/merge-presidents.js
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
  } catch (err) {
    console.error(`Failed to load ${pathname}:`, err.message);
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
    majorEvents: raw.majorEvents || raw.events || [],
    minorEvents: raw.minorEvents || [],
    subcategories: raw.subcategories || {}
  };
}

// NEW: Smart de-duplication + assignment (highest priority wins)
function assignEventsToBestCategory(p) {
  const categories = [
    'crisisManagement', 'domesticPolicy', 'economicPolicy',
    'foreignPolicy', 'judicialPolicy', 'legislation', 'misconduct'
  ];

  // Step 1: Collect ALL events from every category
  const allEvents = [];
  categories.forEach(cat => {
    if (p[cat] && p[cat].majorEvents) {
      p[cat].majorEvents.forEach(event => {
        allEvents.push({ ...event, originalCategory: cat });
      });
    }
  });

  // Step 2: Deduplicate by title + summary
  const uniqueEvents = [];
  const seen = new Set();
  allEvents.forEach(e => {
    const key = `${e.title || ''}|${(e.summary || '').slice(0, 100)}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueEvents.push(e);
    }
  });

  // Step 3: Reset all categories (clear duplicates)
  categories.forEach(cat => {
    if (p[cat]) p[cat].majorEvents = [];
  });

  // Step 4: Assign each unique event to ONE best category
  uniqueEvents.forEach(e => {
    const text = (e.title + " " + (e.summary || "")).toLowerCase();

    // 1. Misconduct - highest priority
    if (text.includes("impeachment") || text.includes("watergate") ||
        text.includes("iran-contra") || text.includes("pardon") ||
        text.includes("scandal") || text.includes("abuse of power") ||
        text.includes("obstruction") || text.includes("perjury") ||
        text.includes("cover-up")) {
      if (p.misconduct) p.misconduct.majorEvents.push(e);
      console.log(`Assigned "${e.title}" → misconduct`);
      return;
    }
    // 2. Crisis Management
    if (text.includes("war") || text.includes("crisis") ||
        text.includes("recession") || text.includes("depression") ||
        text.includes("protest") || text.includes("rebellion") ||
        text.includes("emergency") || text.includes("assassination") ||
        text.includes("terrorism") || text.includes("pandemic") ||
        text.includes("epidemic")) {
      if (p.crisisManagement) p.crisisManagement.majorEvents.push(e);
      console.log(`Assigned "${e.title}" → crisisManagement`);
      return;
    }
    // 3. Foreign Policy
    if (text.includes("treaty") || text.includes("diplomacy") ||
        text.includes("foreign") || text.includes("alliance") ||
        text.includes("china") || text.includes("soviet") ||
        text.includes("nato") || text.includes("embargo")) {
      if (p.foreignPolicy) p.foreignPolicy.majorEvents.push(e);
      console.log(`Assigned "${e.title}" → foreignPolicy`);
      return;
    }
    // 4. Economic Policy
    if (text.includes("tax") || text.includes("economy") ||
        text.includes("inflation") || text.includes("budget") ||
        text.includes("tariff")) {
      if (p.economicPolicy) p.economicPolicy.majorEvents.push(e);
      console.log(`Assigned "${e.title}" → economicPolicy`);
      return;
    }
    // 5. Judicial Policy
    if (text.includes("court") || text.includes("justice") ||
        text.includes("judge") || text.includes("supreme court") ||
        text.includes("appointment") || text.includes("ruling")) {
      if (p.judicialPolicy) p.judicialPolicy.majorEvents.push(e);
      console.log(`Assigned "${e.title}" → judicialPolicy`);
      return;
    }
    // 6. Legislation
    if (text.includes("act of") || text.includes("signed") ||
        text.includes("legislation") || text.includes("law") ||
        text.includes("bill")) {
      if (p.legislation) p.legislation.majorEvents.push(e);
      console.log(`Assigned "${e.title}" → legislation`);
      return;
    }
    // 7. Catch-all: domesticPolicy
    if (p.domesticPolicy) p.domesticPolicy.majorEvents.push(e);
    console.log(`Assigned "${e.title}" → domesticPolicy (fallback)`);
  });

  console.log(`Processed ${uniqueEvents.length} unique events for ${p.name || 'unknown'}`);
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
        const rawCategory = metricsData[category].get(id);
        const hybrid = extractHybridFields(rawCategory[category] || rawCategory);
       
        p[category] = {
          ...p[category],
          ...hybrid
        };
      }
    }

    // NEW: Clean duplicates and assign each event to one best category
    assignEventsToBestCategory(p);
  });
  fs.writeFileSync(RANKINGS_PATH, JSON.stringify(rankings, null, 2));
  console.log(`merge-presidents: merged hybrid metrics into ${rankings.length} presidents`);
}
main();
