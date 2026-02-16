// merge-representatives.js

const fs = require("fs");
const path = require("path");

function loadJSON(relativePath, defaultValue = {}) {
  const fullPath = path.join(__dirname, relativePath);
  try {
    return JSON.parse(fs.readFileSync(fullPath, "utf8"));
  } catch (err) {
    console.error(`Failed to load ${relativePath}: ${err.message}`);
    return defaultValue;
  }
}

// ── Load everything that should exist at this point ─────────────────────────────
const rankings     = loadJSON("../public/representatives-rankings.json", [])   || [];
const committees   = loadJSON("../public/representatives-committees.json", {}) || {};
const votes        = loadJSON("../public/representatives-votes.json", [])      || [];
const legislation  = loadJSON("../public/representatives-legislation.json", [])|| [];

// ── Build fast lookups ───────────────────────────────────────────────────────────
const votesById = new Map(votes.map(v => [v.bioguideId || v.bioguide, v]));
const legById   = new Map(legislation.map(l => [l.bioguideId || l.bioguide, l]));

const committeesById = new Map();

for (const [slug, members] of Object.entries(committees)) {
  if (!Array.isArray(members)) continue;
  for (const m of members) {
    const id = m.bioguide;
    if (!id) continue;
    if (!committeesById.has(id)) committeesById.set(id, []);
    committeesById.get(id).push({
      slug,
      title: m.title || null,
      rank: m.rank || null,
      party: m.party || null,
      name: m.name || null
    });
  }
}

// ── Merge everything ─────────────────────────────────────────────────────────────
const merged = rankings.map(entry => {
  const id = entry.bioguideId || entry.bioguide || null;
  if (!id) return entry;   // safety

  const voteData    = votesById.get(id)    || {};
  const legData     = legById.get(id)      || {};
  const committeeData = committeesById.get(id) || [];

  return {
    ...entry,
    ...voteData,           // ← yea, nay, missed, participation, etc.
    ...legData,            // ← sponsored, cosponsored, becameLaw, etc.
    committees: committeeData,
    // misconduct comes later — don't touch it here
  };
});

// Write
fs.writeFileSync(
  path.join(__dirname, "../public/representatives-merged.json"),
  JSON.stringify(merged, null, 2)
);

console.log(`Wrote merged file — ${merged.length} reps`);
console.log(`Reps with vote data: ${[...votesById.keys()].length}`);
console.log(`Reps with legislation data: ${[...legById.keys()].length}`);
console.log(`Reps with committees: ${committeesById.size}`);
