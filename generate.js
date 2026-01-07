// generate.js
import fs from "fs";

const OUTPUT_PATH = "public/senators-rankings.json";  // ✅ fixed path
const LEGISLATORS_URL = "https://unitedstates.github.io/congress-legislators/legislators-current.json";
const BASE_URL = "https://api.congress.gov/v3";
const API_KEY = process.env.CONGRESS_API_KEY;

if (!API_KEY) {
  console.error("❌ Missing CONGRESS_API_KEY in environment");
  process.exit(1);
}

async function safeFetch(url) {
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`Fetch failed: ${url} (${res.status})`);
    return null;
  }
  return res.json();
}

async function getLegislationCount(bioguide, type) {
  const data = await safeFetch(`${BASE_URL}/member/${bioguide}/${type}?api_key=${API_KEY}&limit=250&format=json`);
  return data?.pagination?.count ?? 0;
}

async function getMissedVotesPct(bioguide) {
  const data = await safeFetch(`${BASE_URL}/member/${bioguide}/votes?api_key=${API_KEY}&limit=250&format=json`);
  if (!data?.results) return 0;
  const votes = data.results;
  const total = votes.length;
  const missed = votes.filter(v => v.voteCast === "Not Voting").length;
  return total > 0 ? ((missed / total) * 100).toFixed(2) : 0;
}

async function getLawsEnacted(bioguide) {
  const data = await safeFetch(`${BASE_URL}/member/${bioguide}/sponsored-legislation?api_key=${API_KEY}&limit=250&format=json`);
  if (!data?.results) return 0;
  return data.results.filter(b => b.latestAction?.action === "BecameLaw").length;
}

async function build() {
  const legislators = await fetch(LEGISLATORS_URL).then(r => r.json());
  const today = new Date().toISOString().slice(0, 10);

  const senators = legislators.filter(l =>
    l.terms.some(t => t.type === "sen" && t.end > today)
  );

  console.log(`Found ${senators.length} current senators`);

  const rankings = [];
  for (const senator of senators) {
    const term = senator.terms.at(-1);
    const bioguide = senator.id.bioguide;
    const name = `${senator.name.first} ${senator.name.last}`;
    const party = term.party;
    const state = term.state;

    console.log(`Processing ${name} (${bioguide})`);

    const missed_votes_pct = await getMissedVotesPct(bioguide);
    const bills_introduced = await getLegislationCount(bioguide, "sponsored-legislation");
    const bills_cosponsored = await getLegislationCount(bioguide, "cosponsored-legislation");
    const laws_enacted = await getLawsEnacted(bioguide);

    rankings.push({
      name,
      office: "Senator",
      party,
      state,
      missed_votes_pct,
      bills_introduced,
      bills_cosponsored,
      laws_enacted,
      committee_positions_score: 0, // placeholder until committee API wired
      bills_out_of_committee: 0,    // placeholder
      misconduct: 0                 // placeholder (GovTrack API)
    });
  }

  rankings.sort((a, b) => a.name.localeCompare(b.name));
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(rankings, null, 2));
  console.log(`✅ senators-rankings.json written with ${rankings.length} records`);
}

build().catch(err => {
  console.error("Script failed:", err);
  process.exit(1);
});
