// pages/api/katie-britt.js

const BASE_URL = "https://api.congress.gov/v3";
const API_KEY = process.env.CONGRESS_API_KEY;

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

export default async function handler(req, res) {
  try {
    // Step 1: Look up Katie Britt’s numeric ID
    const members = await fetchJSON(`${BASE_URL}/member?api_key=${API_KEY}&format=json`);
    const britt = members?.results?.find(m => m.bioguideId === "B001319");
    if (!britt) {
      return res.status(404).json({ error: "Katie Britt not found" });
    }
    const memberId = britt.memberId;

    // Step 2: Use numeric ID in all calls
    const sponsored = await fetchJSON(`${BASE_URL}/member/${memberId}/sponsored-legislation?api_key=${API_KEY}&format=json`);
    const bills_introduced = sponsored?.pagination?.count ?? 0;
    const laws_enacted = sponsored?.results?.filter(b => b.latestAction?.action === "BecameLaw").length ?? 0;
    const floor_consideration = sponsored?.results?.filter(b => b.actions?.some(a => a.action === "Floor Consideration")).length ?? 0;

    const cosponsored = await fetchJSON(`${BASE_URL}/member/${memberId}/cosponsored-legislation?api_key=${API_KEY}&format=json`);
    const bills_cosponsored = cosponsored?.pagination?.count ?? 0;

    const committees = await fetchJSON(`${BASE_URL}/member/${memberId}/committees?api_key=${API_KEY}&format=json`);
    const committee_positions_score = committees?.results?.length ?? 0;

    const votes = await fetchJSON(`${BASE_URL}/member/${memberId}/votes?api_key=${API_KEY}&format=json`);
    const missed_votes = votes?.results?.filter(v => v.voteCast === "Not Voting").length ?? 0;

    const schema = {
      name: `${britt.firstName} ${britt.lastName}`,
      office: "Senator",
      party: britt.party,
      state: britt.state,
      missed_votes,
      bills_introduced,
      bills_cosponsored,
      laws_enacted,
      committee_positions_score,
      floor_consideration
    };

    res.status(200).json(schema);
  } catch (err) {
    console.error("Katie Britt schema failed:", err);
    res.status(500).json({ error: err.message });
  }
}
