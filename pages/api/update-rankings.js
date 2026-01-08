// /pages/api/update-rankings.js

const BASE_URL = "https://api.congress.gov/v3";
const API_KEY = process.env.CONGRESS_API_KEY;

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Bad response ${res.status} from ${url}`);
  return res.json();
}

async function getSenators() {
  const data = await fetchJSON(`${BASE_URL}/member?api_key=${API_KEY}&format=json`);
  return data.results.filter(m => m.memberType === "Senator");
}

async function buildSenator(member) {
  const id = member.bioguideId;

  // Votes
  const votesData = await fetchJSON(`${BASE_URL}/member/${id}/votes?api_key=${API_KEY}&format=json`);
  const votes = votesData.results?.length || 0;

  // Sponsored bills
  const sponsoredData = await fetchJSON(`${BASE_URL}/member/${id}/sponsored-legislation?api_key=${API_KEY}&format=json`);
  const billsSponsored = sponsoredData.pagination?.count || 0;
  const becameLaw = sponsoredData.results?.filter(b => b.latestAction?.action === "BecameLaw").length || 0;

  // Cosponsored bills
  const cosponsoredData = await fetchJSON(`${BASE_URL}/member/${id}/cosponsored-legislation?api_key=${API_KEY}&format=json`);
  const billsCosponsored = cosponsoredData.pagination?.count || 0;

  // Floor consideration
  const floorConsideration = sponsoredData.results?.filter(b => b.latestAction?.action === "FloorConsideration").length || 0;

  // Committees
  const committeesData = await fetchJSON(`${BASE_URL}/member/${id}/committees?api_key=${API_KEY}&format=json`);
  const committees = committeesData.results?.map(c => c.name) || [];

  return {
    name: `${member.firstName} ${member.lastName}`,
    office: "Senator",
    party: member.partyName,
    state: member.state,
    votes,
    billsSponsored,
    billsCosponsored,
    floorConsideration,
    becameLaw,
    committees
  };
}

export default async function handler(req, res) {
  try {
    const senators = await getSenators();
    const data = await Promise.all(senators.map(buildSenator));
    res.status(200).json(data);
  } catch (err) {
    console.error("Error building rankings:", err);
    res.status(500).json({ error: err.message });
  }
}
