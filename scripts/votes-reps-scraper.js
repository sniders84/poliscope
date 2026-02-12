// scripts/votes-reps-scraper.js
// Purpose: Fetch and parse House roll call votes from clerk.house.gov XML
// and update representatives-rankings.json with vote tallies and participation percentages

const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");
const { DOMParser } = require("xmldom");

const OUT_PATH = path.join(__dirname, "..", "public", "representatives-rankings.json");
const YEAR = 2026; // adjust as needed for current Congress
const BASE_URL = `https://clerk.house.gov/evs/${YEAR}/`;

console.log("Starting votes-reps-scraper.js");

function ensureRepShape(rep) {
  return {
    slug: rep.slug,
    bioguideId: rep.bioguideId,
    name: rep.name,
    state: rep.state,
    party: rep.party,
    office: rep.office || "Representative",
    yeaVotes: rep.yeaVotes || 0,
    nayVotes: rep.nayVotes || 0,
    missedVotes: rep.missedVotes || 0,
    totalVotes: rep.totalVotes || 0,
    participationPct: rep.participationPct || 0,
    missedVotePct: rep.missedVotePct || 0
  };
}

function indexByBioguide(list) {
  const map = new Map();
  list.forEach(r => {
    if (r.bioguideId) map.set(r.bioguideId.toUpperCase(), r);
  });
  return map;
}

async function fetchRollCall(num) {
  const url = `${BASE_URL}roll${String(num).padStart(3, "0")}.xml`;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`Failed to fetch roll call ${num}: ${res.status}`);
    return null;
  }
  const xml = await res.text();
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  return doc;
}

(async function main() {
  let reps;
  try {
    reps = JSON.parse(fs.readFileSync(OUT_PATH, "utf-8")).map(ensureRepShape);
    console.log(`Loaded ${reps.length} representatives`);
  } catch (err) {
    console.error("Failed to read representatives-rankings.json:", err.message);
    process.exit(1);
  }

  const repMap = indexByBioguide(reps);

  let processed = 0;
  // Example: scrape first 25 roll calls
  for (let i = 1; i <= 25; i++) {
    const doc = await fetchRollCall(i);
    if (!doc) continue;

    const votes = doc.getElementsByTagName("recorded-vote");
    for (let v of votes) {
      const legislator = v.getElementsByTagName("legislator")[0];
      const voteNode = v.getElementsByTagName("vote")[0];
      if (!legislator || !voteNode) continue;

      const bioguideId = legislator.getAttribute("id");
      const choice = voteNode.textContent.trim();

      if (!bioguideId || !repMap.has(bioguideId.toUpperCase())) continue;
      const rep = repMap.get(bioguideId.toUpperCase());

      rep.totalVotes++;
      if (choice === "Yea") rep.yeaVotes++;
      else if (choice === "Nay") rep.nayVotes++;
      else rep.missedVotes++;
    }
    processed++;
  }

  reps.forEach(r => {
    if (r.totalVotes > 0) {
      r.participationPct = Number(((r.yeaVotes + r.nayVotes) / r.totalVotes * 100).toFixed(2));
      r.missedVotePct = Number((r.missedVotes / r.totalVotes * 100).toFixed(2));
    }
  });

  fs.writeFileSync(OUT_PATH, JSON.stringify(reps, null, 2));
  console.log(`House votes updated: ${processed} roll calls processed`);
})().catch(err => {
  console.error("House votes scraper failed:", err);
  process.exit(1);
});
