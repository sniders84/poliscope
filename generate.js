// generate.js
import fs from "fs";

const OUTPUT_PATH = "public/senators-rankings.json";
const BASE_URL = "https://api.congress.gov/v3";
const API_KEY = "L3az0OJ7TiD0kHhf7g6XKauvHGE2yAvXvCodwaBB"; // your key

async function getJSON(path) {
  const url = `${BASE_URL}/${path}?api_key=${API_KEY}&limit=250&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function getLegislationCount(bioguide, type) {
  const data = await getJSON(`member/${bioguide}/${type}`);
  return data?.pagination?.count ?? 0;
}

async function getMissedVotesPct(bioguide) {
  const data = await getJSON(`member/${bioguide}/votes`);
  if (!data?.results) return 0;
  const votes = data.results;
  const total = votes.length;
  const missed = votes.filter(v => v.voteCast === "Not Voting").length;
  return total > 0 ? ((missed / total) * 100).toFixed(2) : 0;
}

async function getLawsEnacted(bioguide) {
  const data = await getJSON(`member/${bioguide}/sponsored-legislation`);
  if (!data?.results) return 0;
  return data.results.filter(b => b.latestAction?.action === "BecameLaw").length;
}

async function getCommitteeScore(bioguide) {
  const data = await getJSON(`member/${bioguide}/committees`);
  return data?.results?.length ?? 0;
}

async function build() {
  const legislators = await fetch("https://unitedstates.github.io/congress-legislators/legislators-current.json").then(r => r.json());
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
    const committee_positions_score = await getCommitteeScore(bioguide);

    rankings.push({
      name,
      office: "Senator",
      party,
      state,
      missed_votes_pct,
      bills_introduced,
      bills_cosponsored,
      laws_enacted,
      committee_positions_score,
      bills_out_of_committee: 0, // Congress.gov doesn’t expose this cleanly
      misconduct: 0              // GovTrack-only field
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
