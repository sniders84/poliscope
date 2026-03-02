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

// IMPROVED SEVERITY: Better balance of positive legacy vs negative outcomes
function getEventSeverity(title = "", summary = "") {
  const text = (title + " " + summary).toLowerCase();

  // VERY HIGH POSITIVE (iconic achievements)
  if (text.includes("emancipation") || text.includes("civil rights act") || 
      text.includes("voting rights") || text.includes("new deal") || 
      text.includes("social security") || text.includes("medicare") || 
      text.includes("federal reserve") || text.includes("interstate highway")) {
    return 4.5;
  }

  // HIGH POSITIVE (major successful reforms)
  if (text.includes("treaty") || text.includes("reform") || 
      text.includes("signed the") || text.includes("land-grant") || 
      text.includes("homestead") || text.includes("gi bill")) {
    return 3.5;
  }

  // MEDIUM POSITIVE (routine legislation)
  if (text.includes("act of") || text.includes("legislation") || 
      text.includes("bill") || text.includes("law")) {
    return 2.0;
  }

  // NEGATIVE (poor outcomes, scandals, failures)
  if (text.includes("watergate") || text.includes("iran-contra") || 
      text.includes("impeachment") || text.includes("scandal") || 
      text.includes("obstruction") || text.includes("perjury") || 
      text.includes("cover-up") || text.includes("high inflation") || 
      text.includes("supply chain") || text.includes("failed war") || 
      text.includes("vietnam") || text.includes("recession caused")) {
    return -4.0;
  }

  // MEDIUM NEGATIVE (controversial or mixed)
  if (text.includes("pardon") || text.includes("drone") || 
      text.includes("intelligence") || text.includes("controversy") || 
      text.includes("mask") || text.includes("mandate")) {
    return -2.0;
  }

  return 1.0; // default neutral
}

// Smart assignment with improved severity
function assignEventsToBestCategory(p) {
  const categories = [
    'crisisManagement', 'domesticPolicy', 'economicPolicy',
    'foreignPolicy', 'judicialPolicy', 'legislation', 'misconduct'
  ];

  const allEvents = [];
  categories.forEach(cat => {
    if (p[cat] && p[cat].majorEvents) {
      p[cat].majorEvents.forEach(event => {
        allEvents.push({ ...event, originalCategory: cat });
      });
    }
  });

  const uniqueEvents = [];
  const seen = new Set();
  allEvents.forEach(e => {
    const key = `${e.title || ''}|${(e.summary || '').slice(0, 100)}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueEvents.push(e);
    }
  });

  categories.forEach(cat => {
    if (p[cat]) p[cat].majorEvents = [];
  });

  uniqueEvents.forEach(e => {
    const severity = getEventSeverity(e.title || "", e.summary || "");
    const text = (e.title + " " + (e.summary || "")).toLowerCase();

    let assignedCat = 'domesticPolicy';

    if (text.includes("impeachment") || text.includes("watergate") || 
        text.includes("iran-contra") || text.includes("pardon") || 
        text.includes("scandal") || text.includes("abuse of power")) {
      assignedCat = 'misconduct';
    } else if (text.includes("war") || text.includes("crisis") || 
               text.includes("recession") || text.includes("depression") || 
               text.includes("protest") || text.includes("rebellion") || 
               text.includes("emergency") || text.includes("assassination") ||
               text.includes("terrorism") || text.includes("pandemic")) {
      assignedCat = 'crisisManagement';
    } else if (text.includes("treaty") || text.includes("diplomacy") || 
               text.includes("foreign") || text.includes("china") || 
               text.includes("soviet") || text.includes("nato")) {
      assignedCat = 'foreignPolicy';
    } else if (text.includes("tax") || text.includes("economy") || 
               text.includes("inflation") || text.includes("budget") || 
               text.includes("tariff")) {
      assignedCat = 'economicPolicy';
    } else if (text.includes("court") || text.includes("justice") || 
               text.includes("judge") || text.includes("supreme court")) {
      assignedCat = 'judicialPolicy';
    } else if (text.includes("act of") || text.includes("signed") || 
               text.includes("legislation") || text.includes("law") || 
               text.includes("bill")) {
      assignedCat = 'legislation';
    }

    if (p[assignedCat]) {
      p[assignedCat].majorEvents.push(e);
      console.log(`Assigned "${e.title}" → ${assignedCat} (severity ${severity})`);
    }
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

    assignEventsToBestCategory(p);
  });
  fs.writeFileSync(RANKINGS_PATH, JSON.stringify(rankings, null, 2));
  console.log(`merge-presidents: merged hybrid metrics into ${rankings.length} presidents`);
}
main();
