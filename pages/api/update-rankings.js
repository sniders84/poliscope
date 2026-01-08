// /pages/api/update-rankings.js

const BASE_URL = "https://api.congress.gov/v3";
const API_KEY = process.env.CONGRESS_API_KEY;

async function fetchJSON(url) {
  const res = await fetch(url);
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    console.error("Bad JSON from", url, text.slice(0, 200));
    return null;
  }
}

async function getSenators() {
  const data = await fetchJSON(`${BASE_URL}/members?api_key=${API_KEY}&format=json`);
  console.log("Raw members sample:", data?.results?.slice(0, 3));
  return data?.results?.filter(m => m.chamber === "Senate") || [];
}

async function buildSchema(member) {
  const id = member.memberId;

  // Sponsored bills
  const sponsored = await fetchJSON(`${BASE_URL}/member/${id}/sponsored-legislation?api_key=${API_KEY}&format=json`);
  const bills_introduced = sponsored?.pagination?.count ?? 0;
  const laws_enacted = sponsored?.results?.filter(b => b.latestAction?.action === "BecameLaw").length ?? 0;
  const floor_consideration = sponsored?.results?.filter(b =>
    Array.isArray(b.actions) && b.actions.some(a => a.action === "Floor Consideration")
  ).length ?? 0;

  // Cosponsored bills
  const cosponsored = await fetchJSON(`${BASE_URL}/member/${id}/cosponsored-legislation?api_key=${API_KEY}&format=json`);
  const bills_cosponsored = cosponsored?.pagination?.count ?? 0;

  // Committees
  const committees = await fetchJSON(`${BASE_URL}/member/${id}/committees?api_key=${API_KEY}&format=json`);
  const committee_positions_score = committees?.results?.length ?? 0;

  // Votes
  const votes = await fetchJSON(`${BASE_URL}/member/${id}/votes?api_key=${API_KEY}&format=json`);
  const missed_votes = votes?.results?.filter(v => v.voteCast === "Not Voting").length ?? 0;

  return {
    name: `${member.firstName} ${member.lastName}`,
    office: member.chamber === "Senate" ? "Senator" : member.chamber,
    party: member.party,
    state: member.state,
    bills_introduced,
    bills_cosponsored,
    laws_enacted,
    floor_consideration,
    committee_positions_score,
    missed_votes
  };
}

export default async function handler(req, res) {
  try {
    const senators = await getSenators();
    const schemas = await Promise.all(senators.map(buildSchema));
    res.status(200).json(schemas);
  } catch (err) {
    console.error("update-rankings failed:", err);
    res.status(500).json({ error: err.message });
  }
}
