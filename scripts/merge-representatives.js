// merge-representatives.js
// Purpose: Merge rankings + committee data (misconduct added later in workflow)

const fs = require("fs");
const path = require("path");

function loadJSON(relativePath, defaultValue = {}) {
  const fullPath = path.join(__dirname, relativePath);
  try {
    const content = fs.readFileSync(fullPath, "utf8");
    return JSON.parse(content);
  } catch (err) {
    console.error(`Failed to load ${relativePath}: ${err.message}`);
    return defaultValue;
  }
}

function writeJSON(relativePath, data) {
  const fullPath = path.join(__dirname, relativePath);
  fs.writeFileSync(fullPath, JSON.stringify(data, null, 2), "utf8");
}

// ── Load only what actually exists ────────────────────────────────────────
const rankings   = loadJSON("../public/representatives-rankings.json", []) || [];
const committeesObj = loadJSON("../public/representatives-committees.json", {});

// Build fast lookup: bioguide → array of committee roles
const committeesByBioguide = new Map();

for (const [slug, members] of Object.entries(committeesObj)) {
  if (!Array.isArray(members)) {
    console.warn(`Committee ${slug} is not an array — skipping`);
    continue;
  }

  for (const m of members) {
    const bioguide = m.bioguide;
    if (!bioguide) continue;

    if (!committeesByBioguide.has(bioguide)) {
      committeesByBioguide.set(bioguide, []);
    }

    committeesByBioguide.get(bioguide).push({
      slug,
      title: m.title || null,
      rank: m.rank || null,
      party: m.party || "unknown",
      name: m.name || null   // optional, for display if needed
    });
  }
}

// ── Merge ──────────────────────────────────────────────────────────────────
const merged = rankings.map(entry => {
  const bioguide = entry.bioguide || entry.bioguideId || null;

  return {
    ...entry,
    committees: bioguide ? (committeesByBioguide.get(bioguide) || []) : []
    // misconduct will be added in a later step by misconduct-scraper.js
  };
});

writeJSON("../public/representatives-merged.json", merged);

console.log(`Wrote representatives-merged.json with ${merged.length} records`);
console.log(`Members with committee assignments: ${committeesByBioguide.size}`);
