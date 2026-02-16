// merge-representatives.js
const fs = require("fs");
const path = require("path");

function loadJSON(relativePath) {
  const fullPath = path.join(__dirname, relativePath);
  try {
    const content = fs.readFileSync(fullPath, "utf8");
    return JSON.parse(content);
  } catch (err) {
    console.error(`Failed to load ${relativePath}: ${err.message}`);
    return err.code === 'ENOENT' ? {} : null;
  }
}

function writeJSON(relativePath, data) {
  const fullPath = path.join(__dirname, relativePath);
  fs.writeFileSync(fullPath, JSON.stringify(data, null, 2), "utf8");
}

// Load base files
const rankings = loadJSON("../public/representatives-rankings.json") || [];
const info = loadJSON("../public/representatives-info.json") || [];
const committees = loadJSON("../public/representatives-committees.json") || {};
const misconduct = loadJSON("../public/representatives-misconduct.json") || [];

// Build lookup maps
function getIdKey(obj) {
  return obj.bioguideId || obj.bioguide || obj.slug || obj.id || null;
}

// Info by member id
const infoById = new Map();
for (const member of info) {
  const key = getIdKey(member);
  if (key) infoById.set(key, member);
}

// Committees by member id (now correctly using the slug → members structure)
const committeesById = new Map();

for (const [committeeSlug, memberList] of Object.entries(committees)) {
  if (!Array.isArray(memberList)) continue;

  for (const m of memberList) {
    const key = m.bioguide;  // bioguide is the reliable identifier here
    if (!key) continue;

    if (!committeesById.has(key)) {
      committeesById.set(key, []);
    }

    committeesById.get(key).push({
      slug: committeeSlug,
      name: committeeSlug,          // can improve later if you add committee names
      role: m.title || m.rank ? `${m.title || ""} (Rank ${m.rank})` : null,
      rank: m.rank || null,
      title: m.title || null,
      party: m.party || null
    });
  }
}

// Misconduct by member id
const misconductById = new Map();
for (const record of misconduct) {
  const key = getIdKey(record);
  if (!key) continue;
  if (!misconductById.has(key)) {
    misconductById.set(key, []);
  }
  misconductById.get(key).push(record);
}

// Merge everything into a single array
const merged = rankings.map((rankEntry) => {
  const key = getIdKey(rankEntry);
  if (!key) {
    console.warn(`No valid key found for ranking entry: ${JSON.stringify(rankEntry).slice(0, 100)}...`);
    return rankEntry;
  }

  const baseInfo = infoById.get(key) || {};
  const memberCommittees = committeesById.get(key) || [];
  const memberMisconduct = misconductById.get(key) || [];

  return {
    // ranking fields first
    ...rankEntry,

    // then info fields (avoid overwriting id keys)
    ...Object.fromEntries(
      Object.entries(baseInfo).filter(
        ([k]) => !["bioguideId", "bioguide", "slug", "id"].includes(k)
      )
    ),

    // attached collections
    committees: memberCommittees,
    misconduct: memberMisconduct,
  };
});

// Write merged output
writeJSON("../public/representatives-merged.json", merged);

console.log(`representatives-merged.json written with ${merged.length} records`);
console.log(`Members with committee data: ${committeesById.size}`);
