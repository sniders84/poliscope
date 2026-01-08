// /api/update-rankings.js

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
  console.log("Sample members:", data?.results?.slice(0, 3));
  return data?.results?.filter(m => m.chamber === "Senate") || [];
}

async function buildSchema(member) {
  const id = member.memberId;

  const sponsored = await fetchJSON(`${BASE_URL}/member/${id}/sponsored-legislation?api_key=${API_KEY}&format=json`);
  const bills_introduced = sponsored?.pagination?.count ?? 0;
  const laws_enacted = sponsored?.results?.filter(b => b.latestAction?.action === "BecameLaw").length ?? 0;
  const floor_consideration = sponsored?.results?.filter(b => b.actions?.some(a => a.action === "Floor Consideration")).length ?? 0;

  const cosponsored = await fetchJSON(`${BASE_URL}/member/${id}/cosponsored-legislation?api_key=${API_KEY}&format=json`);
  const bills_cosponsored = cosponsored?.pagination?.count ?? 0;

  const committees = await fetchJSON(`${BASE_URL}/member/${id}/committees?api_key=${API_KEY}&format=json`);
  const committee_positions_score = committees?.results?.length ?? 0;

  const votes = await fetchJSON(`${BASE_URL}/member/${id}/votes?api_key=${API_KEY}&format=json`);
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
