// api/update-rankings.js

const BASE_URL = "https://api.congress.gov/v3";
const API_KEY = "L3az0OJ7TiD0kHhf7g6XKauvHGE2yAvXvCodwaBB"; // your Congress.gov key

// Safe fetch wrapper
async function safeFetchJSON(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    console.error("Non‑JSON response from", url, text.slice(0, 200));
    return null;
  }
}

// Congress.gov helpers
async function getLegislationCount(bioguide, type) {
  const data = await safeFetchJSON(`${BASE_URL}/member/${bioguide}/${type}?api_key=${API_KEY}&limit=250&format=json`);
  return data?.pagination?.count ?? 0;
}

async function getLawsEnacted(bioguide) {
  const data = await safeFetchJSON(`${BASE_URL}/member/${bioguide}/sponsored-legislation?api_key=${API_KEY}&limit=250&format=json`);
  if (!data?.results) return 0;
  return data.results.filter(b => b.latestAction?.action === "BecameLaw").length;
}

async function getCommitteeScore(bioguide) {
  const data = await safeFetchJSON(`${BASE_URL}/member/${bioguide}/committees?api_key=${API_KEY}&limit=250&format=json`);
  return data?.results?.length ?? 0;
}

// GovTrack roles for missed_votes_pct + misconduct
async function getGovTrackRolesMap() {
  const data = await safeFetchJSON("https://www.govtrack.us/api/v2/role?current=true&limit=600");
  const map = {};
  if (!data?.objects) return map;
  for (const role of data.objects) {
    if (role.role_type === "senator" && role.person?.bioguideid) {
      map[role.person.bioguideid] = {
        missed_votes_pct: role.missed_votes_pct ?? 0,
        misconduct: role.person.misconduct ?? 0,
      };
    }
  }
  return map;
}

// Legislators list
async function getCurrentLegislators() {
  const data = await safeFetchJSON("https://unitedstates.github.io/congress-legislators/legislators-current.json");
  return Array.isArray(data) ? data : [];
}

async function buildRankings() {
  const legislators = await getCurrentLegislators();
  const today = new Date().toISOString().slice(0, 10);

  const senators = legislators.filter(l =>
    Array.isArray(l.terms) && l.terms.some(t => t.type === "sen" && t.end > today)
  );

  const govtrackMap = await getGovTrackRolesMap();

  const rankings = [];
  for (const senator of senators) {
    const term = senator.terms?.[senator.terms.length - 1] || {};
    const bioguide = senator.id?.bioguide;
    const name = `${senator.name?.first || ""} ${senator.name?.last || ""}`.trim();
    const party = term.party || "";
    const state = term.state || "";

    const bills_introduced = bioguide ? await getLegislationCount(bioguide, "sponsored-legislation") : 0;
    const bills_cosponsored = bioguide ? await getLegislationCount(bioguide, "cosponsored-legislation") : 0;
    const laws_enacted = bioguide ? await getLawsEnacted(bioguide) : 0;
    const committee_positions_score = bioguide ? await getCommitteeScore(bioguide) : 0;

    const govtrack = bioguide ? govtrackMap[bioguide] || {} : {};

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
      bills_out_of_committee: 0, // not exposed by Congress.gov
      misconduct: govtrack.misconduct ?? 0,
    });
  }

  return rankings.sort((a, b) => a.name.localeCompare(b.name));
}

export default async function handler(req, res) {
  try {
    const rankings = await buildRankings();
    res.status(200).json(rankings);
  } catch (err) {
    console.error("update-rankings failed:", err);
    res.status(500).json({ error: err.message });
  }
}
