// generate.js
import fs from "fs";

const OUTPUT_PATH = "public/senators-rankings.json";
const BASE_URL = "https://www.govtrack.us/api/v2";

async function safeFetch(url) {
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`Fetch failed: ${url} (${res.status})`);
    return null;
  }
  return res.json();
}

async function getBillsCount(query) {
  const data = await safeFetch(`${BASE_URL}/bill?${query}`);
  return data?.pagination?.count ?? 0;
}

async function build() {
  // Get all current senators
  const roles = await safeFetch(`${BASE_URL}/role?current=true&role_type=senator`);
  if (!roles?.objects) {
    console.error("❌ Failed to fetch senators");
    process.exit(1);
  }

  const senators = roles.objects;
  console.log(`Found ${senators.length} current senators`);

  const rankings = [];
  for (const role of senators) {
    const person = role.person;
    const id = person.id;
    const name = `${person.firstname} ${person.lastname}`;
    const party = role.party;
    const state = role.state;

    console.log(`Processing ${name} (${id})`);

    // GovTrack stats
    const missed_votes_pct = role.missed_votes_pct ?? 0;
    const bills_introduced = await getBillsCount(`sponsor=${id}`);
    const bills_cosponsored = await getBillsCount(`cosponsor=${id}`);
    const laws_enacted = await getBillsCount(`sponsor=${id}&enacted=true`);

    // Committee positions & misconduct (GovTrack has fields but may need mapping)
    const committee_positions_score = role.committee?.length ?? 0;
    const bills_out_of_committee = 0; // placeholder until mapped
    const misconduct = person.misconduct ?? 0;

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
      bills_out_of_committee,
      misconduct
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
