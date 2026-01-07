// api/update-rankings.js

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

// GovTrack roles for senators
async function getGovTrackRoles() {
  const data = await safeFetchJSON("https://www.govtrack.us/api/v2/role?current=true&limit=600");
  return data?.objects || [];
}

async function buildRankings() {
  const roles = await getGovTrackRoles();

  const rankings = roles
    .filter(role => role.role_type === "senator")
    .map(role => {
      const person = role.person || {};
      const name = `${person.firstname || ""} ${person.lastname || ""}`.trim();
      const party = role.party || "";
      const state = role.state || "";

      return {
        name,
        office: "Senator",
        party,
        state,
        missed_votes_pct: role.missed_votes_pct ?? 0,
        bills_introduced: role.bills_sponsored ?? 0,
        bills_cosponsored: role.bills_cosponsored ?? 0,
        laws_enacted: role.bills_enacted ?? 0,
        committee_positions_score: role.committee_positions?.length ?? 0,
        bills_out_of_committee: 0, // GovTrack doesn’t expose this directly
        misconduct: person.misconduct ?? 0,
      };
    });

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
