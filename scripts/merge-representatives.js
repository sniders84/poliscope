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

function writeJSON(relativePath, data) {
  const fullPath = path.join(__dirname, relativePath);
  fs.writeFileSync(fullPath, JSON.stringify(data, null, 2), "utf8");
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
  if (!Array.isArray(members)) {
    console.warn(`Committee ${slug} is not an array — skipping`);
    continue;
  }

  for (const m of members) {
    const id = m.bioguide;
    if (!id) continue;

    if (!committeesById.has(id)) {
      committeesById.set(id, []);
    }

    const committeeEntry = {
      slug,
      title: m.title || null,
      rank: m.rank || null,
      party: m.party || null,
      name: m.name || null
    };

    // Dedupe: Check if identical entry already exists
    const existing = committeesById.get(id);
    const isDuplicate = existing.some(c => 
      c.slug === committeeEntry.slug && 
      c.title === committeeEntry.title && 
      c.rank === committeeEntry.rank
    );

    if (!isDuplicate) {
      existing.push(committeeEntry);
    }
  }
}

// ── Merge everything ─────────────────────────────────────────────────────────────
const merged = rankings.map(entry => {
  const id = entry.bioguideId || entry.bioguide || null;
  if (!id) return entry;  // safety

  const voteData = votesById.get(id) || {};
  const voteStats = voteData.votes || {};  // Flatten the nested 'votes' object

  const legData = legById.get(id) || {};
  const committeeData = committeesById.get(id) || [];

  // Photo fallback if missing
  let photo = entry.photo;
  if (!photo && id) {
    photo = `https://www.congress.gov/img/member/${id.toLowerCase()}_200.jpg`;
  }

  return {
    ...entry,
    ...voteStats,  // yeaVotes, nayVotes, missedVotes, totalVotes, participationPct, missedVotePct
    ...legData,    // sponsoredBills, cosponsoredBills, becameLawBills, etc.
    committees: committeeData,
    photo
  };
});

// Write
writeJSON("../public/representatives-merged.json", merged);

console.log(`Wrote merged file — ${merged.length} reps`);
console.log(`Reps with vote data: ${[...votesById.keys()].length}`);
console.log(`Reps with legislation data: ${[...legById.keys()].length}`);
console.log(`Reps with committees: ${committeesById.size}`);
