// scripts/votes-reps-scraper.js
// FULL REPLACEMENT — Clerk.House.gov XML scraper with correct vote mapping

const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");
const { XMLParser } = require("fast-xml-parser");

const OUTPUT_PATH = path.join(__dirname, "../public/representatives-votes.json");
const ROSTER_PATH = path.join(__dirname, "../public/legislators-current.json");

// Correct roll call ranges for 119th Congress
const RANGES = {
  2025: 362,
  2026: 70,
};

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
    vote: v.legislator?.vote || "0",
  }));
}

// Correct Clerk XML vote mapping
function normalizeVote(v) {
  if (v === "1") return "yea";      // Yea
  if (v === "2") return "nay";      // Nay
  if (v === "3") return "present";  // Present
  return "missed";                  // 0 or anything else → Not Voting
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

  for (const year of Object.keys(RANGES)) {
    const max = RANGES[year];

    for (let rc = 1; rc <= max; rc++) {
      const num = rc.toString().padStart(3, "0");
      const url = `https://clerk.house.gov/evs/${year}/roll${num}.xml`;

      const xml = await fetchXML(url);
      if (!xml) continue;

      totalRollCalls++;

      const records = parseRollCall(xml);
      for (const rec of records) {
        const id = rec.bioguideId;
        if (!id || !counts.has(id)) continue;

        const c = counts.get(id);
        const vote = normalizeVote(rec.vote);

        if (vote === "yea") c.yea++;
        else if (vote === "nay") c.nay++;
        else if (vote === "missed") c.missed++;
        // "present" is participation but not yea/nay; you can decide later how to score it
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
