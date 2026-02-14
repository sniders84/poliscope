// scripts/votes-reps-scraper.js
// FULL REPLACEMENT — Clerk.House.gov XML scraper for 119th Congress (2025 + 2026)

const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");
const { XMLParser } = require("fast-xml-parser");

const OUTPUT_PATH = path.join(__dirname, "../public/representatives-votes.json");
const ROSTER_PATH = path.join(__dirname, "../public/legislators-current.json");

// Known roll call ranges for 119th Congress
const RANGES = {
  2025: 362,
  2026: 70,
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
});

// Load House roster (current reps only)
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

// Parse a single roll call XML into { bioguideId, rawVote }
function parseRollCall(xml) {
  const data = parser.parse(xml);
  const root = data["rollcall-vote"];
  if (!root) return [];

  const votesNode = root["vote-data"]?.["recorded-vote"];
  if (!votesNode) return [];

  const arr = Array.isArray(votesNode) ? votesNode : [votesNode];

  return arr.map((v) => {
    const leg = v.legislator || {};
    return {
      bioguideId: leg["name-id"] || null,          // attribute on <legislator>
      rawVote: v.vote != null ? String(v.vote).trim() : "", // <vote>Yea</vote>
    };
  });
}

// Normalize Clerk vote text/codes
function normalizeVote(v) {
  const s = String(v).trim().toLowerCase();

  // Text forms
  if (s === "yea" || s === "aye" || s === "yes") return "yea";
  if (s === "nay" || s === "no") return "nay";
  if (s === "not voting" || s === "nv") return "missed";
  if (s === "present") return "present";

  // Numeric fallbacks (if ever used)
  if (s === "1") return "yea";
  if (s === "2") return "nay";
  if (s === "3") return "present";
  if (s === "0") return "missed";

  return "missed";
}

// Aggregate votes for all members across all roll calls
async function aggregateVotes() {
  const reps = loadHouseRoster();
  const counts = new Map();

  for (const r of reps) {
    const id = r.id?.bioguide;
    if (id) counts.set(id, { yea: 0, nay: 0, missed: 0 });
  }

  let totalRollCalls = 0;

  for (const yearStr of Object.keys(RANGES)) {
    const year = Number(yearStr);
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
        const vote = normalizeVote(rec.rawVote);

        if (vote === "yea") c.yea++;
        else if (vote === "nay") c.nay++;
        else if (vote === "missed") c.missed++;
        // "present" counts as participation but not yea/nay; you can decide later how to score it
      }
    }
  }

  console.log(`Processed ${totalRollCalls} roll calls total.`);
  return { counts, totalRollCalls };
}

// Build final output JSON
function buildOutput(reps, counts, totalRollCalls) {
  return reps.map((r) => {
    const id = r.id?.bioguide;
    const c = counts.get(id) || { yea: 0, nay: 0, missed: 0 };
    const yea = c.yea;
    const nay = c.nay;
    const missed = c.missed;
    const total = yea + nay + missed;

    return {
      bioguideId: id,
      votes: {
        yeaVotes: yea,
        nayVotes: nay,
        missedVotes: missed,
        totalVotes: total,
        participationPct:
          total > 0 ? +(((yea + nay) / total) * 100).toFixed(2) : 0,
        missedVotePct:
          total > 0 ? +((missed / total) * 100).toFixed(2) : 0,
      },
    };
  });
}

// Main
async function main() {
  console.log("Starting Clerk XML scraper for 119th Congress…");

  const reps = loadHouseRoster();
  const { counts, totalRollCalls } = await aggregateVotes();
  const output = buildOutput(reps, counts, totalRollCalls);

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
  console.log(
    `Wrote ${output.length} records to ${OUTPUT_PATH} using ${totalRollCalls} roll calls.`,
  );
}

main().catch((err) => {
  console.error("votes-reps-scraper.js failed:", err);
  process.exit(1);
});
