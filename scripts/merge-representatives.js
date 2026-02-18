// merge-representatives.js
// Enriches and overwrites representatives-rankings.json with all scraper data,
// including committees from representatives-committees.json.

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

// Load base rankings (will be overwritten)
let rankings = loadJSON("../public/representatives-rankings.json", []) || [];

// Load intermediates
const votes        = loadJSON("../public/representatives-votes.json", []) || [];
const legislation  = loadJSON("../public/representatives-legislation.json", []) || [];
const committeeRaw = loadJSON("../public/representatives-committees.json", {}) || {};

// Lookups
const votesById = new Map(votes.map(v => [v.bioguideId || v.bioguide, v.votes || {}]));
const legById   = new Map(legislation.map(l => [l.bioguideId || l.bioguide, l]));

// Committee code → full name (House)
const codeToName = {
  HSAG: "Agriculture",
  HSAP: "Appropriations",
  HSAS: "Armed Services",
  HSBA: "Financial Services",
  HSBU: "Budget",
  HSED: "Education and the Workforce",
  HSFA: "Foreign Affairs",
  HSGO: "Oversight and Accountability",
  HSHM: "Homeland Security",
  HSIF: "Energy and Commerce",
  HSII: "Natural Resources",
  HSJU: "Judiciary",
  HSPW: "Transportation and Infrastructure",
  HSRU: "Rules",
  HSSM: "Science, Space, and Technology",
  HSSY: "Small Business",
  HSVR: "Veterans' Affairs",
  HSWM: "Ways and Means",
  HLIG: "Intelligence",
  HSHA: "House Administration",
  HSQJ: "Joint Economic Committee"
};

// Build committeesById from committee membership file
const committeesById = new Map();

for (const [committeeCode, members] of Object.entries(committeeRaw)) {
  if (!Array.isArray(members)) continue;
  if (!codeToName[committeeCode]) continue;

  for (const m of members) {
    const id = m.bioguide || m.bioguideId || null;
    const nameKey = (m.name || "").toLowerCase();
    const key = id || nameKey;
    if (!key) continue;

    if (!committeesById.has(key)) committeesById.set(key, []);

    let role = m.title || "Member";
    if (m.rank === 1 || role.toLowerCase().includes("chair")) role = "Chair";
    if (m.rank === 2 || role.toLowerCase().includes("ranking")) role = "Ranking Member";

    committeesById.get(key).push({
      committeeCode,
      committeeName: codeToName[committeeCode] || committeeCode,
      role,
      rank: m.rank ?? null,
      party: m.party || null
    });
  }
}

// Enrich rankings
const enriched = rankings.map(entry => {
  const id = entry.bioguideId || entry.bioguide || null;
  const nameKey = entry.name ? entry.name.toLowerCase() : null;

  const voteStats = votesById.get(id) || {};
  const legStats  = legById.get(id)   || {};

  const committees =
    committeesById.get(id) ||
    committeesById.get(entry.bioguide) ||
    committeesById.get(nameKey) ||
    [];

  let photo = entry.photo;
  if (!photo && id) {
    photo = `https://www.congress.gov/img/member/${id.toLowerCase()}_200.jpg`;
  }

  return {
    ...entry,
    ...voteStats,
    ...legStats,
    committees,
    photo
  };
});

// Write final rankings
writeJSON("../public/representatives-rankings.json", enriched);

// Stats
const withVotes = enriched.filter(r => (r.yeaVotes || 0) > 0 || (r.totalVotes || 0) > 0).length;
const withLeg   = enriched.filter(r => (r.sponsoredBills || 0) > 0 || (r.cosponsoredBills || 0) > 0).length;
const withCom   = enriched.filter(r => (r.committees || []).length > 0).length;

console.log(`Enriched and overwrote representatives-rankings.json with ${enriched.length} representatives`);
console.log(`Reps with vote data: ${withVotes}`);
console.log(`Reps with legislation data: ${withLeg}`);
console.log(`Reps with committees: ${withCom}`);
