// merge-senators.js
// Enriches and overwrites senators-rankings.json with all scraper data

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

function writeJSON(relativePath, data) {
  const fullPath = path.join(__dirname, relativePath);
  fs.writeFileSync(fullPath, JSON.stringify(data, null, 2), "utf8");
  console.log(`Wrote/updated: ${relativePath}`);
}

// Load base (we will overwrite this file)
let rankings = loadJSON("../public/senators-rankings.json", []) || [];

// Load intermediates (adjust filenames if different)
const committees   = loadJSON("../public/senators-committees.json", {}) || {};
const votes        = loadJSON("../public/senators-votes.json", [])      || [];
const legislation  = loadJSON("../public/legislation-senators.json", [])|| []; // <--- this is the key missing one

// Lookups
const votesById = new Map(votes.map(v => [v.bioguideId || v.bioguide, v.votes || {}]));
const legById   = new Map(legislation.map(l => [l.bioguideId || l.bioguide, l]));

const committeesById = new Map();
for (const [slug, members] of Object.entries(committees)) {
  if (!Array.isArray(members)) continue;
  for (const m of members) {
    const id = m.bioguide;
    if (!id) continue;
    if (!committeesById.has(id)) committeesById.set(id, []);
    const entry = {
      slug,
      title: m.title || null,
      rank: m.rank || null,
      party: m.party || null,
      name: m.name || null
    };
    const existing = committeesById.get(id);
    const isDup = existing.some(c => c.slug === entry.slug && c.title === entry.title && c.rank === entry.rank);
    if (!isDup) existing.push(entry);
  }
}

// Enrich
const enriched = rankings.map(entry => {
  const id = entry.bioguideId || entry.bioguide || null;
  if (!id) return entry;

  const voteStats     = votesById.get(id)    || {};
  const legStats      = legById.get(id)      || {};
  const committeeList = committeesById.get(id) || [];

  let photo = entry.photo;
  if (!photo && id) {
    photo = `https://www.congress.gov/img/member/${id.toLowerCase()}_200.jpg`;
  }

  return {
    ...entry,
    ...voteStats,
    ...legStats,            // sponsoredBills, cosponsoredBills, becameLawBills, etc.
    committees: committeeList,
    photo
  };
});

// Overwrite rankings.json
writeJSON("../public/senators-rankings.json", enriched);

// Stats
const repsWithVotes = enriched.filter(r => (r.yeaVotes || 0) > 0 || (r.totalVotes || 0) > 0).length;
const repsWithLeg   = enriched.filter(r => (r.sponsoredBills || 0) > 0 || (r.cosponsoredBills || 0) > 0).length;
const repsWithCom   = enriched.filter(r => (r.committees || []).length > 0).length;

console.log(`Enriched and overwrote senators-rankings.json with ${enriched.length} senators`);
console.log(`Senators with vote data: ${repsWithVotes}`);
console.log(`Senators with legislation data: ${repsWithLeg}`);
console.log(`Senators with committees: ${repsWithCom}`);
