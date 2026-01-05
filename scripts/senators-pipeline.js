// scripts/senators-pipeline.js
// Baby step: build public/senators-rankings.json from Congress.gov only.

const fs = require("fs");
const path = require("path");
const fetch = (...args) => import("node-fetch").then(({ default: f }) => f(...args));

const API_KEY = process.env.CONGRESS_API_KEY;

// Seed list: bioguide IDs for current senators.
// Baby step: include a few IDs; we’ll expand later.
const SENATORS = [
  "T000476", // Thom Tillis (NC)
  "B001135", // Cory Booker (NJ)
  "M001111"  // Lisa Murkowski (AK)
];

async function fetchMember(id) {
  const url = `https://api.congress.gov/v3/member/${id}?api_key=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Member fetch failed ${id}: ${res.status}`);
  const data = await res.json();
  return data.member;
}

async function fetchSponsoredCount(id) {
  const url = `https://api.congress.gov/v3/member/${id}/sponsored-legislation?api_key=${API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  const count = data.pagination?.count ?? 0;
  const enacted = Array.isArray(data.results)
    ? data.results.filter(b => b.enacted === true).length
    : 0;
  return { count, enacted };
}

async function fetchCosponsoredCount(id) {
  const url = `https://api.congress.gov/v3/member/${id}/cosponsored-legislation?api_key=${API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  return data.pagination?.count ?? 0;
}

async function fetchCommitteesScore(id) {
  const url = `https://api.congress.gov/v3/member/${id}/committees?api_key=${API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  return data.pagination?.count ?? 0;
}

function normalizeParty(partyName) {
  if (!partyName) return null;
  const p = Array.isArray(partyName) ? partyName[0] : partyName;
  const s = String(p).toLowerCase();
  if (s.startsWith("r")) return "R";
  if (s.startsWith("d")) return "D";
  if (s.startsWith("i")) return "I";
  return p;
}

async function buildSenatorRecord(id) {
  const member = await fetchMember(id);
  const { count: bills_introduced, enacted: laws_enacted } = await fetchSponsoredCount(id);
  const bills_cosponsored = await fetchCosponsoredCount(id);
  const committee_positions_score = await fetchCommitteesScore(id);

  return {
    name: member.fullName,
    office: "Senator",
    party: normalizeParty(member.partyName),
    state: member.state,
    missed_votes_pct: null,
    bills_introduced,
    bills_cosponsored,
    laws_enacted,
    committee_positions_score,
    bipartisan_cosponsored_count: null,
    bipartisan_sponsored_count: null,
    powerful_cosponsors_count: null,
    leadership_score: null,
    cross_chamber_count: null,
    bills_out_of_committee: null,
    misconduct: 0
  };
}

async function main() {
  if (!API_KEY) {
    console.error("Missing CONGRESS_API_KEY");
    process.exit(1);
  }

  const records = [];
  for (const id of SENATORS) {
    try {
      const rec = await buildSenatorRecord(id);
      records.push(rec);
      console.log(`OK: ${rec.name}`);
    } catch (err) {
      console.error(`FAIL ${id}:`, err.message);
    }
  }

  const outDir = path.join(process.cwd(), "public");
  const outFile = path.join(outDir, "senators-rankings.json");

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(records, null, 2), "utf-8");
  console.log(`Wrote ${records.length} records to ${outFile}`);
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
