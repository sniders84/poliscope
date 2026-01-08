// scripts/updateSenators.js
const fs = require("fs");
const path = require("path");

const BASE = "https://api.congress.gov/v3";
const API_KEY = process.env.CONGRESS_API_KEY;

async function safeFetchJSON(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`Skipping ${url} -> ${res.status}`);
      return {};
    }
    return res.json();
  } catch (err) {
    console.warn(`Error fetching ${url}: ${err.message}`);
    return {};
  }
}

async function getSenatorsRoster() {
  const out = [];
  let offset = 0;
  const limit = 250;
  const year = new Date().getFullYear();

  while (true) {
    const url = `${BASE}/member?api_key=${API_KEY}&format=json&offset=${offset}&limit=${limit}`;
    const data = await safeFetchJSON(url);
    const members = data.results || data.members || [];
    if (members.length === 0) break;

    for (const m of members) {
      const terms = Array.isArray(m.terms?.item) ? m.terms.item : [];
      const isCurrentSenator = terms.some(
        t => t.chamber === "Senate" && (!t.endYear || Number(t.endYear) >= year)
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
    if (!next) break;
    offset += limit;
  }

  return out;
}

async function tallySponsored(id) {
  let offset = 0;
  const limit = 250;
  let sponsoredBills = 0, sponsoredAmendments = 0;
  let becameLawBills = 0, becameLawAmendments = 0;

  while (true) {
    const url = `${BASE}/member/${id}/sponsored-legislation?api_key=${API_KEY}&format=json&offset=${offset}&limit=${limit}`;
    const data = await safeFetchJSON(url);
    const items = data.legislation || (data.results?.legislation) || [];
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

    const next = data.pagination?.next;
    if (!next) break;
    offset += limit;
  }

  return { sponsoredBills, sponsoredAmendments, becameLawBills, becameLawAmendments };
}

async function tallyCosponsored(id) {
  let offset = 0;
  const limit = 250;
  let cosponsoredBills = 0, cosponsoredAmendments = 0;

  while (true) {
    const url = `${BASE}/member/${id}/cosponsored-legislation?api_key=${API_KEY}&format=json&offset=${offset}&limit=${limit}`;
    const data = await safeFetchJSON(url);
    const items = data.legislation || (data.results?.legislation) || [];
    if (items.length === 0) break;

    for (const item of items) {
      const type = (item.legislationType || "").toLowerCase();
      if (type.includes("amendment")) {
        cosponsoredAmendments++;
      } else if (type.includes("bill")) {
        cosponsoredBills++;
      }
    }

    const next = data.pagination?.next;
    if (!next) break;
    offset += limit;
  }

  return { cosponsoredBills, cosponsoredAmendments };
}

async function buildRecord(s) {
  const sponsored = await tallySponsored(s.bioguideId);
  const cosponsored = await tallyCosponsored(s.bioguideId);

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
    committees: [], // placeholder
    votes: 0        // placeholder
  };
}

async function main() {
  const roster = await getSenatorsRoster();
  const results = [];
  for (const s of roster) {
    const rec = await buildRecord(s);
    results.push(rec);
    console.log(`Built ${s.name} (${s.state})`);
  }

  // ✅ Correct path: repo root + public/
  const filePath = path.join(process.cwd(), "public", "senators-rankings.json");
  fs.writeFileSync(filePath, JSON.stringify(results, null, 2));
  console.log(`Updated senators-rankings.json with ${results.length} current senators`);
}

main().catch(err => {
  console.error("Error updating senators-rankings.json:", err);
  process.exit(1);
});
