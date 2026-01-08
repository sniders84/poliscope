// scripts/updateSenators.js
const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");

const BASE_API = "https://api.congress.gov/v3";
const SPONSORS_URL = "https://www.congress.gov/sponsors-cosponsors/119th-congress/senators/ALL";
const API_KEY = process.env.CONGRESS_API_KEY;

// A real browser UA and sensible headers to avoid 403
const HTML_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Connection": "keep-alive"
};

async function safeFetch(url, opts = {}) {
  try {
    const res = await fetch(url, opts);
    if (!res.ok) {
      console.warn(`Skipping ${url} -> ${res.status}`);
      return null;
    }
    return res;
  } catch (err) {
    console.warn(`Error fetching ${url}: ${err.message}`);
    return null;
  }
}

async function safeFetchJSON(url) {
  const res = await safeFetch(url);
  return res ? res.json() : {};
}

// Paginate the roster so we don’t stop at the first page
async function getSenatorRoster() {
  const currentYear = new Date().getFullYear();
  const out = [];
  let offset = 0;
  const limit = 250; // big enough for all members, but we’ll still loop

  // Congress API uses pagination; iterate until no more results
  while (true) {
    const url = `${BASE_API}/member?api_key=${API_KEY}&format=json&offset=${offset}&limit=${limit}`;
    const data = await safeFetchJSON(url);
    const members = data.results || data.members || [];

    for (const m of members) {
      const terms = Array.isArray(m.terms?.item) ? m.terms.item : [];
      const isCurrentSenator = terms.some(
        t => t.chamber === "Senate" && (!t.endYear || Number(t.endYear) >= currentYear)
      );
      if (isCurrentSenator) {
        out.push({
          name: m.name,
          state: m.state,
          party: m.partyName,
          office: "Senator",
          bioguideId: m.bioguideId
        });
      }
    }

    const next = data.pagination?.next;
    if (!next || members.length === 0) break;
    offset += limit;
  }

  // Deduplicate just in case
  const seen = new Set();
  return out.filter(s => {
    const key = `${s.name}|${s.state}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function scrapeSponsorPage() {
  const res = await safeFetch(SPONSORS_URL, { headers: HTML_HEADERS });
  if (!res) return new Map();
  const html = await res.text();
  const $ = cheerio.load(html);

  const results = new Map();

  // Rows of the main table
  $("table tbody tr").each((_, row) => {
    const $row = $(row);
    const cells = $row.find("td");

    // Member cell: first td
    const memberCell = $(cells.get(0));
    const link = memberCell.find("a").first();
    const nameText = link.text().trim() || memberCell.text().trim();

    // Parse "(MD - Democrat)" -> state, party
    const metaText = memberCell.text().replace(nameText, "").trim();
    const stateMatch = metaText.match(/\(([^-\)]+)\s*-\s*([^\)]+)\)/);
    const state = stateMatch ? stateMatch[1].trim() : "";
    const party = stateMatch ? stateMatch[2].trim() : "";

    // Sponsored and cosponsored cells
    const sponsoredCell = $(cells.get(1));
    const cosponsoredCell = $(cells.get(2));

    const parseCounts = (cell) => {
      const text = cell.text().replace(/\s+/g, " ").trim();
      const sponsoredBills = Number((text.match(/Bills:\s*(\d+)/i) || [0, 0])[1]);
      const sponsoredAmendments = Number((text.match(/Amendments:\s*(\d+)/i) || [0, 0])[1]);
      const becameLawBills = Number((text.match(/Bills.*Became\s*Law:\s*(\d+)/i) || [0, 0])[1]);
      const becameLawAmendments = Number((text.match(/Amendments.*Became\s*Law:\s*(\d+)/i) || [0, 0])[1]);
      return { sponsoredBills, sponsoredAmendments, becameLawBills, becameLawAmendments };
    };

    const s = parseCounts(sponsoredCell);
    const c = parseCounts(cosponsoredCell);

    const key = `${nameText}|${state}`;
    results.set(key, {
      sponsoredBills: s.sponsoredBills,
      sponsoredAmendments: s.sponsoredAmendments,
      cosponsoredBills: c.sponsoredBills,
      cosponsoredAmendments: c.sponsoredAmendments,
      becameLawBills: s.becameLawBills,
      becameLawAmendments: s.becameLawAmendments,
      party
    });
  });

  return results;
}

async function augmentWithCommitteesAndVotes(senator) {
  const id = senator.bioguideId;

  const committeesData = await safeFetchJSON(`${BASE_API}/member/${id}/committees?api_key=${API_KEY}&format=json`);
  const committees = (committeesData.results || committeesData.committees || [])
    .map(c => c.name)
    .filter(Boolean);

  const votesData = await safeFetchJSON(`${BASE_API}/member/${id}/votes?api_key=${API_KEY}&format=json`);
  const votesCount =
    (votesData.pagination && Number(votesData.pagination.count)) ||
    (Array.isArray(votesData.results) ? votesData.results.length : 0) ||
    0;

  return { ...senator, committees, votes: votesCount };
}

async function main() {
  const roster = await getSenatorRoster(); // full, paginated list
  const countsByKey = await scrapeSponsorPage(); // activity counts

  const merged = [];
  for (const s of roster) {
    const key = `${s.name}|${s.state}`;
    const counts = countsByKey.get(key) || {
      sponsoredBills: 0,
      sponsoredAmendments: 0,
      cosponsoredBills: 0,
      cosponsoredAmendments: 0,
      becameLawBills: 0,
      becameLawAmendments: 0
    };

    const base = {
      name: s.name,
      state: s.state,
      party: s.party,
      office: "Senator",
      sponsoredBills: counts.sponsoredBills,
      sponsoredAmendments: counts.sponsoredAmendments,
      cosponsoredBills: counts.cosponsoredBills,
      cosponsoredAmendments: counts.cosponsoredAmendments,
      becameLawBills: counts.becameLawBills,
      becameLawAmendments: counts.becameLawAmendments,
      committees: [],
      votes: 0,
      bioguideId: s.bioguideId
    };

    const augmented = await augmentWithCommitteesAndVotes(base);
    merged.push(augmented);
  }

  const output = merged.map(({ bioguideId, ...publicFields }) => publicFields);
  const filePath = path.join(process.cwd(), "public", "senators-rankings.json");
  fs.writeFileSync(filePath, JSON.stringify(output, null, 2));
  console.log(`Updated senators-rankings.json with ${output.length} current senators`);
}

main().catch(err => {
  console.error("Error updating senators-rankings.json:", err);
  process.exit(1);
});
