// merge-senators.js
// Enriches and overwrites senators-rankings.json with all scraper data,
// including committees from senators-committee-membership-current.json.

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

// ------------------------------------------------------------
// LOAD BASE FILES
// ------------------------------------------------------------

let rankings = loadJSON("../public/senators-rankings.json", []) || [];

const votes        = loadJSON("../public/senators-votes.json", []) || [];
const legislation  = loadJSON("../public/legislation-senators.json", []) || [];
const committeeRaw = loadJSON("../public/senators-committee-membership-current.json", {}) || {};

// ------------------------------------------------------------
// LOOKUPS
// ------------------------------------------------------------

const votesById = new Map(
  votes.map(v => [v.bioguideId || v.bioguide, v])
);

const legById = new Map(
  legislation.map(l => [l.bioguideId || l.bioguide, l])
);

// Committee code → full name
const codeToName = {
  SSAF: 'Agriculture, Nutrition, and Forestry',
  SSAP: 'Appropriations',
  SSAS: 'Armed Services',
  SSBK: 'Banking, Housing, and Urban Affairs',
  SSCV: 'Commerce, Science, and Transportation',
  SSCM: 'Energy and Natural Resources',
  SSEV: 'Environment and Public Works',
  SSFI: 'Finance',
  SSFR: 'Foreign Relations',
  SSGA: 'Homeland Security and Governmental Affairs',
  SSHR: 'Health, Education, Labor, and Pensions',
  SSJU: 'Judiciary',
  SSRA: 'Rules and Administration',
  SSSC: 'Small Business and Entrepreneurship',
  SSVA: 'Veterans\' Affairs',
  SLIA: 'Indian Affairs',
  SLIN: 'Intelligence',
  SLET: 'Ethics',
  SRES: 'Aging (Special)',
  JCSE: 'Economic',
  JSEC: 'Taxation',
  JSLC: 'Library of Congress',
  JSPW: 'Printing',
  SPAG: 'Agriculture (Joint)',
  SSEG: 'Energy (Joint)',
  SSNR: 'Natural Resources (Joint)',
  SSIS: 'Intelligence (Select)',
};

// ------------------------------------------------------------
// BUILD committeesById
// ------------------------------------------------------------

const committeesById = new Map();

for (const [committeeCode, members] of Object.entries(committeeRaw)) {
  if (!Array.isArray(members)) continue;

  // FIXED: Only skip subcommittees, not missing names or long codes
  if (committeeCode.includes("Subcommittee")) continue;

  for (const m of members) {
    const id = (m.bioguide || m.bioguideId || "").toUpperCase();
    const nameKey = (m.name || "").toLowerCase();
    const key = id || nameKey;
    if (!key) continue;

    if (!committeesById.has(key)) committeesById.set(key, []);

    let role = m.title || "Member";
    const lower = role.toLowerCase();

    if (m.rank === 1 || lower.includes("chair")) {
      role = "Chair";
    } else if (m.rank === 2 || lower.includes("ranking")) {
      role = "Ranking Member";
    } else if (lower.includes("vice")) {
      role = "Vice Chair";
    } else {
      role = "Member";
    }

    committeesById.get(key).push({
      committeeCode,
      committeeName: codeToName[committeeCode] || committeeCode,
      role,
      rank: m.rank ?? null,
      party: m.party || null
    });
  }
}

// ------------------------------------------------------------
// ENRICH RANKINGS
// ------------------------------------------------------------

const enriched = rankings.map(entry => {
  const id = (entry.bioguideId || entry.bioguide || "").toUpperCase();
  const nameKey = entry.name ? entry.name.toLowerCase() : "";

  const voteStats = votesById.get(id) || {};
  const legStats  = legById.get(id)   || {};

  const committees =
    committeesById.get(id) ||
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

// ------------------------------------------------------------
// WRITE OUTPUT
// ------------------------------------------------------------

writeJSON("../public/senators-rankings.json", enriched);

const withVotes = enriched.filter(r => (r.yeaVotes || 0) > 0 || (r.totalVotes || 0) > 0).length;
const withLeg   = enriched.filter(r => (r.sponsoredBills || 0) > 0 || (r.cosponsoredBills || 0) > 0).length;
const withCom   = enriched.filter(r => (r.committees || []).length > 0).length;

console.log(`Enriched and overwrote senators-rankings.json with ${enriched.length} senators`);
console.log(`Senators with vote data: ${withVotes}`);
console.log(`Senators with legislation data: ${withLeg}`);
console.log(`Senators with committees: ${withCom}`);
