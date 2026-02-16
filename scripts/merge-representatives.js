// merge-representatives.js

const fs = require("fs");
const path = require("path");

function loadJSON(relativePath) {
  const fullPath = path.join(__dirname, relativePath);
  return JSON.parse(fs.readFileSync(fullPath, "utf8"));
}

function writeJSON(relativePath, data) {
  const fullPath = path.join(__dirname, relativePath);
  fs.writeFileSync(fullPath, JSON.stringify(data, null, 2), "utf8");
}

// Load base files
const rankings = loadJSON("public/representatives-rankings.json");
const info = loadJSON("public/representatives-info.json");

// Committees can be an object keyed by committee or an array.
// Normalize to a flat array of committee objects.
let committees = loadJSON("public/representatives-committees.json");
if (!Array.isArray(committees)) {
  committees = Object.values(committees).flat();
}

// Misconduct is optional; if missing, treat as empty.
let misconduct = [];
try {
  misconduct = loadJSON("public/representatives-misconduct.json");
} catch {
  misconduct = [];
}

// Build lookup maps

function getIdKey(obj) {
  return obj.bioguideId || obj.slug || obj.id || null;
}

// Info by member id
const infoById = new Map();
for (const member of info) {
  const key = getIdKey(member);
  if (!key) continue;
  infoById.set(key, member);
}

// Committees by member id
const committeesById = new Map();
for (const committee of committees) {
  const members = committee.members || committee.member_list || [];
  for (const m of members) {
    const key = getIdKey(m);
    if (!key) continue;
    if (!committeesById.has(key)) {
      committeesById.set(key, []);
    }
    committeesById.get(key).push({
      code: committee.code || committee.id || null,
      name: committee.name || committee.title || null,
      role: m.role || m.position || null,
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
  const baseInfo = (key && infoById.get(key)) || {};
  const memberCommittees = (key && committeesById.get(key)) || [];
  const memberMisconduct = (key && misconductById.get(key)) || [];

  return {
    // ranking fields first
    ...rankEntry,

    // then info fields (without overwriting id keys if already present in rankings)
    ...Object.fromEntries(
      Object.entries(baseInfo).filter(
        ([k]) => !["bioguideId", "slug", "id"].includes(k)
      )
    ),

    // attached collections
    committees: memberCommittees,
    misconduct: memberMisconduct,
  };
});

// Write merged output
writeJSON("public/representatives-merged.json", merged);

console.log("representatives-merged.json written with", merged.length, "records");
