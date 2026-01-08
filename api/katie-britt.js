// scripts/senators-scraper.js
// Run this daily to refresh senators-rankings.json

import fs from "fs";
import path from "path";
import fetch from "node-fetch";

const BASE_URL = "https://api.congress.gov/v3";
const API_KEY = process.env.CONGRESS_API_KEY; // store your key in env

async function fetchJSON(url) {
  const res = await fetch(url);
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    console.error("Non-JSON response from", url, text.slice(0, 200));
    return null;
  }
}

async function getAllMembers() {
  const data = await fetchJSON(`${BASE_URL}/member?api_key=${API_KEY}&format=json`);
  return data?.results || [];
}

async function buildSenatorSchema(member) {
  const memberId = member.memberId;

  // Sponsored bills
  const sponsored = await fetchJSON(`${BASE_URL}/member/${memberId}/sponsored-legislation?api_key=${API_KEY}&format=json`);
  const bills_introduced = sponsored?.pagination?.count ?? 0;
  const laws_enacted = sponsored?.results?.filter(b => b.latestAction?.action === "BecameLaw").length ?? 0;
  const floor_consideration = sponsored?.results?.filter(b => b.actions?.some(a => a.action === "Floor Consideration")).length ?? 0;

  // Cosponsored bills
  const cosponsored = await fetchJSON(`${BASE_URL}/member/${memberId}/cosponsored-legislation?api_key=${API_KEY}&format=json`);
  const bills_cosponsored = cosponsored?.pagination?.count ?? 0;

  // Committees
  const committees = await fetchJSON(`${BASE_URL}/member/${memberId}/committees?api_key=${API_KEY}&format=json`);
  const committee_positions_score = committees?.results?.length ?? 0;

  // Votes (missed votes)
  const votes = await fetchJSON(`${BASE_URL}/member/${memberId}/votes?api_key=${API_KEY}&format=json`);
  const missed_votes = votes?.results?.filter(v => v.voteCast === "Not Voting").length ?? 0;

  return {
    name: `${member.firstName} ${member.lastName}`,
    office: "Senator",
    party: member.party,
    state: member.state,
    missed_votes,
    bills_introduced,
    bills_cosponsored,
    laws_enacted,
    committee_positions_score,
    floor_consideration
  };
}

async function main() {
  const members = await getAllMembers();
  const senators = members.filter(m => m.role === "Senator");

  const results = [];
  for (const senator of senators) {
    try {
      const schema = await buildSenatorSchema(senator);
      results.push(schema);
    } catch (err) {
      console.error(`Failed for ${senator.firstName} ${senator.lastName}:`, err);
    }
  }

  const outputPath = path.join(process.cwd(), "public", "senators-rankings.json");
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`✅ Wrote ${results.length} senators to ${outputPath}`);
}

main().catch(err => {
  console.error("Scraper failed:", err);
  process.exit(1);
});
