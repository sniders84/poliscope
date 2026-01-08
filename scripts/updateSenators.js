// scripts/updateSenators.js
const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");

const BASE_URL = "https://api.congress.gov/v3";
const API_KEY = process.env.CONGRESS_API_KEY;

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Bad response ${res.status} from ${url}`);
  return res.json();
}

async function getSenators() {
  const data = await fetchJSON(`${BASE_URL}/member?api_key=${API_KEY}&format=json`);
  const members = data.results || data.members || [];

  // Only include members with a current Senate term
  return members.filter(m =>
    Array.isArray(m.terms?.item) &&
    m.terms.item.some(term =>
      term.chamber === "Senate" &&
      (!term.endYear || term.endYear >= new Date().getFullYear())
    )
  );
}

async function buildSenator(member) {
  const id = member.bioguideId;

  const votesData = await fetchJSON(`${BASE_URL}/member/${id}/votes?api_key=${API_KEY}&format=json`);
  const votes = votesData.results?.length || 0;

  const sponsoredData = await fetchJSON(`${BASE_URL}/member/${id}/sponsored-legislation?api_key=${API_KEY}&format=json`);
  const billsSponsored = sponsoredData.pagination?.count || 0;
  const becameLaw = sponsoredData.results?.filter(b => b.latestAction?.action === "BecameLaw").length || 0;
  const floorConsideration = sponsoredData.results?.filter(b => b.latestAction?.action === "FloorConsideration").length || 0;

  const cosponsoredData = await fetchJSON(`${BASE_URL}/member/${id}/cosponsored-legislation?api_key=${API_KEY}&format=json`);
  const billsCosponsored = cosponsoredData.pagination?.count || 0;

  const committeesData = await fetchJSON(`${BASE_URL}/member/${id}/committees?api_key=${API_KEY}&format=json`);
  const committees = committeesData.results?.map(c => c.name) || [];

  return {
    name: member.name,
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

async function main() {
  try {
    const senators = await getSenators();
    const data = await Promise.all(senators.map(buildSenator));

    const filePath = path.join(process.cwd(), "public", "senators-rankings.json");
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

    console.log(`Updated senators-rankings.json with ${data.length} current senators`);
  } catch (err) {
    console.error("Error updating senators-rankings.json:", err);
    process.exit(1);
  }
}

main();
