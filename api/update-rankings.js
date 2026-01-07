// api/update-rankings.js
import fs from "fs";
import path from "path";

const BASE_URL = "https://api.congress.gov/v3";
const API_KEY = "L3az0OJ7TiD0kHhf7g6XKauvHGE2yAvXvCodwaBB"; // your Congress.gov key

async function getJSON(pathSegment) {
  const url = `${BASE_URL}/${pathSegment}?api_key=${API_KEY}&limit=250&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function getLegislationCount(bioguide, type) {
  const data = await getJSON(`member/${bioguide}/${type}`);
  return data?.pagination?.count ?? 0;
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

// GovTrack roles for missed_votes_pct + misconduct
async function getGovTrackRoles() {
  const res = await fetch("https://www.govtrack.us/api/v2/role?current=true&limit=600");
  const data = await res.json();
  const map = {};
  for (const role of data.objects) {
    if (role.role_type === "senator") {
      map[role.person.bioguideid] = {
        missed_votes_pct: role.missed_votes_pct ?? 0,
        misconduct: role.person.misconduct ?? 0
      };
    }
  }
  return map;
}

async function buildRankings() {
  const legislators = await fetch("https://unitedstates.github.io/congress-legislators/legislators-current.json").then(r => r.json());
  const today = new Date().toISOString().slice(0, 10);
  const senators = legislators.filter(l => l.terms.some(t => t.type === "sen" && t.end > today));

  const govtrackMap = await getGovTrackRoles();

  const rankings = [];
  for (const senator of senators) {
    const term = senator.terms.at(-1);
    const bioguide = senator.id.bioguide;
    const name = `${senator.name.first} ${senator.name.last}`;
    const party = term.party;
    const state = term.state;

    const bills_introduced = await getLegislationCount(bioguide, "sponsored-legislation");
    const bills_cosponsored = await getLegislationCount(bioguide, "cosponsored-legislation");
    const laws_enacted = await getLawsEnacted(bioguide);
    const committee_positions_score = await getCommitteeScore(bioguide);

    const govtrack = govtrackMap[bioguide] || {};

    rankings.push({
      name,
      office: "Senator",
      party,
      state,
      missed_votes_pct: govtrack.missed_votes_pct ?? 0,
      bills_introduced,
      bills_cosponsored,
      laws_enacted,
      committee_positions_score,
      bills_out_of_committee: 0, // Congress.gov doesn’t expose this
      misconduct: govtrack.misconduct ?? 0
    });
  }

  return rankings.sort((a, b) => a.name.localeCompare(b.name));
}

export default async function handler(req, res) {
  try {
    const rankings = await buildRankings();

    // Return JSON directly (Vercel functions can’t persist files in /public)
    res.status(200).json(rankings);
  } catch (err) {
    console.error("Script failed:", err);
    res.status(500).json({ error: err.message });
  }
}
