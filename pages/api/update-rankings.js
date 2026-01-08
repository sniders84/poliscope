// /pages/api/update-rankings.js
// Next.js API route for Vercel (Pages Router)

const BASE_URL = "https://api.congress.gov/v3";
const API_KEY = process.env.CONGRESS_API_KEY; // set in Vercel Environment Variables

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

// Fetch all pages of /members, optionally constrained to chamber=Senate
async function getAllMembers({ chamber = null } = {}) {
  const members = [];
  const base = `${BASE_URL}/members?api_key=${API_KEY}&format=json`;
  const urlBase = chamber ? `${base}&chamber=${encodeURIComponent(chamber)}` : base;

  // First page to discover pagination
  const first = await fetchJSON(urlBase);
  if (!first || !first.results) return [];

  members.push(...first.results);
  const totalPages = first.pagination?.pages ?? 1;

  // Fetch remaining pages
  for (let page = 2; page <= totalPages; page++) {
    const pageData = await fetchJSON(`${urlBase}&page=${page}`);
    if (pageData?.results?.length) {
      members.push(...pageData.results);
    }
  }

  return members;
}

async function getSenators() {
  // Prefer server-side filtering by chamber to reduce payload
  const all = await getAllMembers({ chamber: "Senate" });
  // Defensive filter in case the API doesn't honor chamber param
  const senators = (all || []).filter(m => m.chamber === "Senate");
  return senators;
}

async function buildSchema(member) {
  const id = member.memberId;

  // Sponsored legislation
  const sponsored = await fetchJSON(`${BASE_URL}/member/${id}/sponsored-legislation?api_key=${API_KEY}&format=json`);
  const bills_introduced = sponsored?.pagination?.count ?? 0;
  const laws_enacted = sponsored?.results?.filter(b => b.latestAction?.action === "BecameLaw").length ?? 0;
  const floor_consideration = sponsored?.results?.filter(b =>
    Array.isArray(b.actions) && b.actions.some(a => a.action === "Floor Consideration")
  ).length ?? 0;

  // Cosponsored legislation
  const cosponsored = await fetchJSON(`${BASE_URL}/member/${id}/cosponsored-legislation?api_key=${API_KEY}&format=json`);
  const bills_cosponsored = cosponsored?.pagination?.count ?? 0;

  // Committees
  const committees = await fetchJSON(`${BASE_URL}/member/${id}/committees?api_key=${API_KEY}&format=json`);
  const committee_positions_score = committees?.results?.length ?? 0;

  // Votes (missed votes count)
  const votes = await fetchJSON(`${BASE_URL}/member/${id}/votes?api_key=${API_KEY}&format=json`);
  const missed_votes = votes?.results?.filter(v => v.voteCast === "Not Voting").length ?? 0;

  return {
    name: `${member.firstName} ${member.lastName}`,
    office: "Senator",
    party: member.party,
    state: member.state,
    missed_votes,              // count of missed votes
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

    // If still empty, fall back to fetching all members and filtering locally
    const finalRoster = senators.length ? senators : (await getAllMembers()).filter(m => m.chamber === "Senate");

    if (!finalRoster.length) {
      return res.status(200).json([]); // explicit empty to avoid confusion
    }

    const schemas = await Promise.all(finalRoster.map(buildSchema));
    res.status(200).json(schemas);
  } catch (err) {
    console.error("update-rankings failed:", err);
    res.status(500).json({ error: err.message });
  }
}
