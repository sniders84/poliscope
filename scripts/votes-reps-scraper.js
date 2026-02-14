// scripts/votes-reps-scraper.js
// FULL REPLACEMENT — Clerk.House.gov XML scraper for 119th Congress (2025 + 2026)

const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");
const { XMLParser } = require("fast-xml-parser");

const OUTPUT_PATH = path.join(__dirname, "../public/representatives-votes.json");
const ROSTER_PATH = path.join(__dirname, "../public/legislators-current.json");

const YEARS = [2025, 2026]; // Full 119th Congress
const MAX_ROLLCALL = 999;   // Safe upper bound

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
});

// Load House roster
function loadHouseRoster() {
  const raw = fs.readFileSync(ROSTER_PATH, "utf8");
  const all = JSON.parse(raw);

  return all.filter((m) => {
    const last = m.terms?.[m.terms.length - 1];
    return last && last.type === "rep";
  });
}

// Fetch XML safely
async function fetchXML(url) {
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.text();
}

// Parse a single roll call XML
function parseRollCall(xml) {
  const data = parser.parse(xml);
  if (!data["rollcall-vote"]) return null;

  const votes = data["rollcall-vote"]["vote-data"]?.["recorded-vote"];
  if (!votes) return [];

  const arr = Array.isArray(votes) ? votes : [votes];

  return arr.map((v) => ({
    bioguideId: v.legislator?.["name-id"] || null,
    vote: v.legislator?.vote || "Not Voting",
  }));
}

// Normalize vote
function normalizeVote(v) {
  const s = v.toLowerCase();
  if (s.includes("yea") || s.includes("yes") || s.includes("aye")) return "yea";
  if (s.includes("nay") || s.includes("no")) return "nay";
  return "missed";
}

// Aggregate votes for all members
async function aggregateVotes() {
  const reps = loadHouseRoster();
  const counts = new Map();

  for (const r of reps) {
    const id = r.id?.bioguide;
    if (id) counts.set(id, { yea: 0, nay: 0, missed: 0 });
  }

  let totalRollCalls = 0;

  for (const year of YEARS) {
    for (let rc = 1; rc <= MAX_ROLLCALL; rc++) {
      const num = rc.toString().padStart(3, "0");

      // CORRECT HOUSE URL FORMAT
      const url = `https://clerk.house.gov/evs/${year}/roll${num}.xml`;

      const xml = await fetchXML(url);
      if (!xml) {
        if (rc > 50) break; // stop early if no votes for a while
        continue;
      }

      totalRollCalls++;

      const records = parseRollCall(xml);
      for (const rec of records) {
        const id = rec.bioguideId;
        if (!id || !counts.has(id)) continue;

        const c = counts.get(id);
        const vote = normalizeVote(rec.vote);

        if (vote === "yea") c.yea++;
        else if (vote === "nay") c.nay++;
        else c.missed++;
      }
    }
  }

  console.log(`Processed ${totalRollCalls} roll calls total.`);
  return counts;
}

// Build final output
function buildOutput(reps, counts) {
  return reps.map((r) => {
    const id = r.id?.bioguide;
    const c = counts.get(id) || { yea: 0, nay: 0, missed: 0 };
    const total = c.yea + c.nay + c.missed;

    return {
      bioguideId: id,
      votes: {
        yeaVotes: c.yea,
        nayVotes: c.nay,
        missedVotes: c.missed,
        totalVotes: total,
        participationPct:
          total > 0 ? +(((c.yea + c.nay) / total) * 100).toFixed(2) : 0,
        missedVotePct:
          total > 0 ? +((c.missed / total) * 100).toFixed(2) : 0,
      },
    };
  });
}

// Main
async function main() {
  console.log("Starting Clerk XML scraper for 119th Congress…");

  const reps = loadHouseRoster();
  const counts = await aggregateVotes();
  const output = buildOutput(reps, counts);

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
  console.log(`Wrote ${output.length} records to ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error("votes-reps-scraper.js failed:", err);
  process.exit(1);
});
