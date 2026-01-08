// scripts/updateSenators.js
const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");

const BASE_API = "https://api.congress.gov/v3";
const SPONSORS_URL = "https://www.congress.gov/sponsors-cosponsors/119th-congress/senators/ALL";
const API_KEY = process.env.CONGRESS_API_KEY;

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

/**
 * Get current senators roster from Congress.gov API.
 * Returns array of { name, state, party, office: "Senator", bioguideId }
 */
async function getSenatorRoster() {
  const data = await safeFetchJSON(`${BASE_API}/member?api_key=${API_KEY}&format=json`);
  const members = data.results || data.members || [];
  const currentYear = new Date().getFullYear();

  return members
    .filter(m => {
      // Keep only Senate current-term members
      const terms = Array.isArray(m.terms?.item) ? m.terms.item : [];
      return terms.some(t => t.chamber === "Senate" && (!t.endYear || Number(t.endYear) >= currentYear));
    })
    .map(m => ({
      name: m.name,
      state: m.state,
      party: m.partyName,
      office: "Senator",
      bioguideId: m.bioguideId
    }));
}

/**
 * Scrape sponsors/cosponsors counts from Congress.gov page.
 * Returns Map keyed by "Name|State" -> { sponsoredBills, sponsoredAmendments, cosponsoredBills, cosponsoredAmendments, becameLawBills, becameLawAmendments }
 */
async function scrapeSponsorPage() {
  const res = await safeFetch(SPONSORS_URL);
  if (!res) return new Map();
  const html = await res.text();
  const $ = cheerio.load(html);

  const results = new Map();

  // The page renders a table of senators with counts; selectors may change,
  // but we target row-wise parsing by inspecting cells with clear labels.
  $("table tbody tr").each((_, row) => {
    const $row = $(row);

    // Member cell: extract "Name" and "(State - Party)" or similar
    const memberCell = $row.find("td").first();
    const nameText = memberCell.find("a").first().text().trim() || memberCell.text().trim();

    // Attempt to parse state from trailing text e.g., "(MD - Democrat)"
    const metaText = memberCell.text().replace(nameText, "").trim();
    const stateMatch = metaText.match(/\(([^-\)]+)\s*-\s*([^\)]+)\)/); // (MD - Democrat)
    const state = stateMatch ? stateMatch[1].trim() : "";
    const party = stateMatch ? stateMatch[2].trim() : "";

    // Sponsored and cosponsored cells (next columns)
    const cells = $row.find("td");
    const sponsoredCell = $(cells.get(1));
    const cosponsoredCell = $(cells.get(2));

    const parseCellCounts = (cell) => {
      // Look for labeled counts inside cell, e.g., "Bills: 34", "Amendments: 158"
      const text = cell.text().replace(/\s+/g, " ").trim();
      const billsMatch = text.match(/Bills:\s*(\d+)/i);
      const amendsMatch = text.match(/Amendments:\s*(\d+)/i);

      // Became Law subtotals (if present)
      const becameLawBillsMatch = text.match(/Bills.*Became\s*Law:\s*(\d+)/i);
      const becameLawAmendsMatch = text.match(/Amendments.*Became\s*Law:\s*(\d+)/i);

      return {
        bills: billsMatch ? Number(billsMatch[1]) : 0,
        amends: amendsMatch ? Number(amendsMatch[1]) : 0,
        becameLawBills: becameLawBillsMatch ? Number(becameLawBillsMatch[1]) : 0,
        becameLawAmendments: becameLawAmendsMatch ? Number(becameLawAmendsMatch[1]) : 0
      };
    };

    const sponsored = parseCellCounts(sponsoredCell);
    const cosponsored = parseCellCounts(cosponsoredCell);

    const key = `${nameText}|${state}`;
    results.set(key, {
      sponsoredBills: sponsored.bills,
      sponsoredAmendments: sponsored.amends,
      cosponsoredBills: cosponsored.bills,
      cosponsoredAmendments: cosponsored.amends,
      becameLawBills: sponsored.becameLawBills || 0,
      becameLawAmendments: sponsored.becameLawAmendments || 0,
      party
    });
  });

  return results;
}

/**
 * Augment each senator with committees (names) and votes count.
 */
async function augmentWithCommitteesAndVotes(senator) {
  const id = senator.bioguideId;

  const committeesData = await safeFetchJSON(`${BASE_API}/member/${id}/committees?api_key=${API_KEY}&format=json`);
  const committees = (committeesData.results || committeesData.committees || [])
    .map(c => c.name)
    .filter(Boolean);

  const votesData = await safeFetchJSON(`${BASE_API}/member/${id}/votes?api_key=${API_KEY}&format=json`);
  // Use pagination.count if present; otherwise length of results
  const votesCount =
    (votesData.pagination && Number(votesData.pagination.count)) ||
    (Array.isArray(votesData.results) ? votesData.results.length : 0) ||
    0;

  return {
    ...senator,
    committees,
    votes: votesCount
  };
}

async function main() {
  const roster = await getSenatorRoster(); // authoritative identity and bioguideId
  const countsByKey = await scrapeSponsorPage(); // activity counts by "Name|State"

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
      bioguideId: s.bioguideId // retained for audit/debug; strip if you don’t want it public
    };

    const augmented = await augmentWithCommitteesAndVotes(base);
    merged.push(augmented);
  }

  const output = merged.map(({ bioguideId, ...publicFields }) => publicFields); // remove bioguideId if not needed in JSON
  const filePath = path.join(process.cwd(), "public", "senators-rankings.json");
  fs.writeFileSync(filePath, JSON.stringify(output, null, 2));
  console.log(`Updated senators-rankings.json with ${output.length} current senators`);
}

main().catch(err => {
  console.error("Error updating senators-rankings.json:", err);
  process.exit(1);
});
