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

async function getMembers() {
  const data = await fetchJSON(`${BASE_URL}/members?api_key=${API_KEY}&format=json`);
  console.log("Raw members sample:", data?.results?.slice(0, 3));
  return data?.results || [];
}

export default async function handler(req, res) {
  try {
    const members = await getMembers();
    res.status(200).json(members);
  } catch (err) {
    console.error("update-rankings failed:", err);
    res.status(500).json({ error: err.message });
  }
}
