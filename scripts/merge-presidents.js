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
    // Ignore placeholders — we don't need them anymore
    majorEvents: raw.majorEvents || raw.events || [],
    minorEvents: raw.minorEvents || [],
    subcategories: raw.subcategories || {}
  };
}

// NEW: De-duplicate and assign each event to ONE best category
function assignEventsToBestCategory(p) {
  // Collect ALL events from every category
  const allEvents = [];
  const categories = [
    'crisisManagement', 'domesticPolicy', 'economicPolicy',
    'foreignPolicy', 'judicialPolicy', 'legislation', 'misconduct'
  ];

  categories.forEach(cat => {
    if (p[cat] && p[cat].majorEvents) {
      p[cat].majorEvents.forEach(event => {
        allEvents.push({ ...event, originalCategory: cat });
      });
    }
  });

  // Deduplicate by title + summary similarity
  const uniqueEvents = [];
  const seen = new Set();
  allEvents.forEach(e => {
    const key = `${e.title || ''}|${(e.summary || '').slice(0, 100)}`; // simple dedupe key
    if (!seen.has(key)) {
      seen.add(key);
      uniqueEvents.push(e);
    }
  });

  // Reset all categories' events
  categories.forEach(cat => {
    if (p[cat]) {
      p[cat].majorEvents = [];
    }
  });

  // Assign each unique event to ONE category (highest priority wins)
  uniqueEvents.forEach(e => {
    const text = (e.title + " " + (e.summary || "")).toLowerCase();
    let assigned = false;

    // 1. Highest priority: misconduct
    if (text.includes("impeachment") || text.includes("watergate") ||
        text.includes("iran-contra") || text.includes("pardon") ||
        text.includes("scandal") || text.includes("abuse of power") ||
        text.includes("obstruction") || text.includes("perjury") ||
        text.includes("cover-up")) {
      if (p.misconduct) p.misconduct.majorEvents.push(e);
      console.log(`Assigned "${e.title}" to misconduct`);
      assigned = true;
    }
    // 2. Crisis Management
    else if (text.includes("war") || text.includes("crisis") ||
             text.includes("recession") || text.includes("depression") ||
             text.includes("protest") || text.includes("rebellion") ||
             text.includes("emergency") || text.includes("assassination") ||
             text.includes("terrorism") || text.includes("pandemic") ||
             text.includes("epidemic")) {
      if (p.crisisManagement) p.crisisManagement.majorEvents.push(e);
      console.log(`Assigned "${e.title}" to crisisManagement`);
      assigned = true;
    }
    // 3. Foreign Policy
    else if (text.includes("treaty") || text.includes("diplomacy") ||
             text.includes("foreign") || text.includes("alliance") ||
             text.includes("china") || text.includes("soviet") ||
             text.includes("nato") || text.includes("embargo")) {
      if (p.foreignPolicy) p.foreignPolicy.majorEvents.push(e);
      console.log(`Assigned "${e.title}" to foreignPolicy`);
      assigned = true;
    }
    // 4. Economic Policy
    else if (text.includes("tax") || text.includes("economy") ||
             text.includes("inflation") || text.includes("budget") ||
             text.includes("tariff")) {
      if (p.economicPolicy) p.economicPolicy.majorEvents.push(e);
      console.log(`Assigned "${e.title}" to economicPolicy`);
      assigned = true;
    }
    // 5. Judicial Policy
    else if (text.includes("court") || text.includes("justice") ||
             text.includes("judge") || text.includes("supreme court") ||
             text.includes("appointment") || text.includes("ruling")) {
      if (p.judicialPolicy) p.judicialPolicy.majorEvents.push(e);
      console.log(`Assigned "${e.title}" to judicialPolicy`);
      assigned = true;
    }
    // 6. Legislation (specific laws/acts)
    else if (text.includes("act of") || text.includes("signed") ||
             text.includes("legislation") || text.includes("law") ||
             text.includes("bill")) {
      if (p.legislation) p.legislation.majorEvents.push(e);
      console.log(`Assigned "${e.title}" to legislation`);
      assigned = true;
    }
    // 7. Catch-all: domesticPolicy
    else {
      if (p.domesticPolicy) p.domesticPolicy.majorEvents.push(e);
      console.log(`Assigned "${e.title}" to domesticPolicy (fallback)`);
      assigned = true;
    }

    if (!assigned) {
      console.log(`WARNING: No assignment for "${e.title}"`);
    }
  });

  console.log(`Processed ${uniqueEvents.length} unique events for ${p.name || 'unknown president'}`);
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
        // FIXED: No extra [category] lookup
        const rawCategory = metricsData[category].get(id);
        const hybrid = extractHybridFields(rawCategory[category] || rawCategory);
       
        // Merge (preserve any bootstrap fields, overwrite with real data)
        p[category] = {
          ...p[category],
          ...hybrid
        };
      }
    }

    // NEW: After merging, clean up duplicates and assign to best category
    assignEventsToBestCategory(p);
  });
  fs.writeFileSync(RANKINGS_PATH, JSON.stringify(rankings, null, 2));
  console.log(`merge-presidents: merged hybrid metrics into ${rankings.length} presidents`);
}
main();
