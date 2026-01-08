// scripts/updateSenators.js
const fs = require("fs");
const path = require("path");

const BASE = "https://api.congress.gov/v3";
const API_KEY = process.env.CONGRESS_API_KEY;

// Aggregate across these congresses to avoid zero data when "current" is sparse
const CONGRESSES = ["current", "118", "117"];

// Basic JSON fetch with minimal noise
async function safeFetchJSON(url) {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "poliscope-bot/1.0",
        "Accept": "application/json"
      }
    });
    if (!res.ok) {
      console.warn(`Skipping ${url} -> ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.warn(`Error fetching ${url}: ${err.message}`);
    return null;
  }
}

// Roster of current members; filter for Senate
async function getSenatorsRoster() {
  const out = [];
  let offset = 0;
  const limit = 250;

  while (true) {
    const url = `${BASE}/member?congress=current&api_key=${API_KEY}&format=json&offset=${offset}&limit=${limit}`;
    const data = await safeFetchJSON(url);
    if (!data) break;
    const members = data.results?.members || data.members || [];
    if (members.length === 0) break;

    for (const m of members) {
      if (m.chamber === "Senate") {
        out.push({
          name: m.name,
          state: m.state,
          party: m.partyName,
          office: "Senator",
          bioguideId: m.bioguideId
        });
      }
    }

    const next = data.results?.pagination?.next;
    if (!next) break;
    offset += limit;
  }

  return out;
}

// Tally sponsored legislation across multiple congresses
async function tallySponsored(id) {
  let sponsoredBills = 0, sponsoredAmendments = 0;
  let becameLawBills = 0, becameLawAmendments = 0;

  for (const congress of CONGRESSES) {
    let offset = 0;
    const limit = 250;

    while (true) {
      const url = `${BASE}/member/${id}/sponsored-legislation?congress=${congress}&api_key=${API_KEY}&format=json&offset=${offset}&limit=${limit}`;
      const data = await safeFetchJSON(url);
      if (!data) break;
      const items = data.results?.legislation || [];
      if (items.length === 0) break;

      for (const item of items) {
        const type = (item.legislationType || "").toLowerCase();
        const becameLaw = item.latestAction?.action === "BecameLaw";

        if (type.includes("amendment")) {
          sponsoredAmendments++;
          if (becameLaw) becameLawAmendments++;
        } else if (type.includes("bill")) {
          sponsoredBills++;
          if (becameLaw) becameLawBills++;
        }
      }

      const next = data.results?.pagination?.next;
      if (!next) break;
      offset += limit;
    }
  }

  return { sponsoredBills, sponsoredAmendments, becameLawBills, becameLawAmendments };
}

// Tally cosponsored legislation across multiple congresses
async function tallyCosponsored(id) {
  let cosponsoredBills = 0, cosponsoredAmendments = 0;

  for (const congress of CONGRESSES) {
    let offset = 0;
    const limit = 250;

    while (true) {
      const url = `${BASE}/member/${id}/cosponsored-legislation?congress=${congress}&api_key=${API_KEY}&format=json&offset=${offset}&limit=${limit}`;
      const data = await safeFetchJSON(url);
      if (!data) break;
      const items = data.results?.legislation || [];
      if (items.length === 0) break;

      for (const item of items) {
        const type = (item.legislationType || "").toLowerCase();
        if (type.includes("amendment")) {
          cosponsoredAmendments++;
        } else if (type.includes("bill")) {
          cosponsoredBills++;
        }
      }

      const next = data.results?.pagination?.next;
      if (!next) break;
      offset += limit;
    }
  }

  return { cosponsoredBills, cosponsoredAmendments };
}

// Pull committees for the member (current congress)
async function getCommittees(id) {
  const url = `${BASE}/member/${id}/committees?congress=current&api_key=${API_KEY}&format=json`;
  const data = await safeFetchJSON(url);
  const committees = data?.results?.committees || [];
  // Normalize to committee names (or codes if missing)
  return committees.map(c => c.name || c.committeeCode || "Unknown");
}

// Build record for one senator
async function buildRecord(s) {
  const sponsored = await tallySponsored(s.bioguideId);
  const cosponsored = await tallyCosponsored(s.bioguideId);
  const committees = await getCommittees(s.bioguideId);

  return {
    name: s.name,
    state: s.state,
    party: s.party,
    office: "Senator",
    sponsoredBills: sponsored.sponsoredBills,
    sponsoredAmendments: sponsored.sponsoredAmendments,
    cosponsoredBills: cosponsored.cosponsoredBills,
    cosponsoredAmendments: cosponsored.cosponsoredAmendments,
    becameLawBills: sponsored.becameLawBills,
    becameLawAmendments: sponsored.becameLawAmendments,
    committees,
    votes: 0 // placeholder until vote aggregation is wired
  };
}

// Main
async function main() {
  const roster = await getSenatorsRoster();
  const results = [];
  for (const s of roster) {
    const rec = await buildRecord(s);
    results.push(rec);
    console.log(`Built ${s.name} (${s.state})`);
  }

  const filePath = path.join(process.cwd(), "public", "senators-rankings.json");
  fs.writeFileSync(filePath, JSON.stringify(results, null, 2));
  console.log(`Updated senators-rankings.json with ${results.length} current senators`);
}

main().catch(err => {
  console.error("Error updating senators-rankings.json:", err);
  process.exit(1);
});
