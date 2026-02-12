// scripts/votes-reps-scraper.js
// Purpose: Scrape ALL House roll call votes for the 119th Congress
// and update representatives-rankings.json

const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");
const { DOMParser } = require("xmldom");

const rankingsPath = path.join(__dirname, "../public/representatives-rankings.json");
const YEAR = 2026; // adjust if needed
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
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const xml = await res.text();
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    return doc;
  } catch {
    return null;
  }
}

(async function main() {
  let reps;
  try {
    reps = JSON.parse(fs.readFileSync(rankingsPath, "utf-8")).map(ensureRepShape);
    console.log(`Loaded ${reps.length} representatives`);
  } catch (err) {
    console.error("Failed to read representatives-rankings.json:", err.message);
    process.exit(1);
  }

  const repMap = indexByBioguide(reps);

  let processed = 0;
  let roll = 1;

  // Loop until no more roll call XML files are found
  while (true) {
    const doc = await fetchRollCall(roll);
    if (!doc) {
      console.log(`No more roll calls after ${roll - 1}`);
      break;
    }

    const votes = doc.getElementsByTagName("recorded-vote");
    if (!votes || votes.length === 0) {
      roll++;
      continue;
    }

    let yeaCount = 0, nayCount = 0, nvCount = 0;

    for (let v of votes) {
      const legislator = v.getElementsByTagName("legislator")[0];
      const voteNode = v.getElementsByTagName("vote")[0];
      if (!legislator || !voteNode) continue;

      const bioguideId = legislator.getAttribute("id");
      const choice = voteNode.textContent.trim();

      if (!bioguideId || !repMap.has(bioguideId.toUpperCase())) continue;
      const rep = repMap.get(bioguideId.toUpperCase());

      rep.totalVotes++;
      if (choice === "Yea") {
        rep.yeaVotes++;
        yeaCount++;
      } else if (choice === "Nay") {
        rep.nayVotes++;
        nayCount++;
      } else {
        rep.missedVotes++;
        nvCount++;
      }
    }

    console.log(`Roll ${roll}: Yeas=${yeaCount}, Nays=${nayCount}, NV=${nvCount}`);
    processed++;
    roll++;
  }

  reps.forEach(r => {
    if (r.totalVotes > 0) {
      r.participationPct = Number(((r.yeaVotes + r.nayVotes) / r.totalVotes * 100).toFixed(2));
      r.missedVotePct = Number((r.missedVotes / r.totalVotes * 100).toFixed(2));
    }
  });

  fs.writeFileSync(rankingsPath, JSON.stringify(reps, null, 2));
  console.log(`House votes updated: ${processed} roll calls processed`);
})();
