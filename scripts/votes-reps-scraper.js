// scripts/votes-reps-scraper.js
// Scrapes the FULL 119th Congress House roll call voting record from Congress.gov
// Aggregates per-member stats across ALL sessions and ALL votes in the Congress.

const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");

const API_KEY = process.env.CONGRESS_API_KEY;
if (!API_KEY) {
  console.error("CONGRESS_API_KEY is not set in the environment.");
  process.exit(1);
}

const CONGRESS = 119;
const SESSIONS = [1, 2]; // cover the entire Congress (all sessions)

const ROSTER_PATH = path.join(__dirname, "../public/legislators-current.json");
const OUTPUT_PATH = path.join(__dirname, "../public/representatives-votes.json");
const BASE_URL = "https://api.congress.gov/v3";

async function fetchJSON(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "poliscope/1.0",
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  return res.json();
}

function loadHouseRoster() {
  const roster = JSON.parse(fs.readFileSync(ROSTER_PATH, "utf8"));
  return roster.filter((m) => m.terms && m.terms[m.terms.length - 1]?.type === "rep");
}

async function fetchAllHouseVotesForSession(session) {
  console.log(`Discovering House roll calls for Congress ${CONGRESS}, session ${session}...`);

  let page = 1;
  const pageSize = 250;
  let allVotes = [];

  while (true) {
    const url = `${BASE_URL}/house-vote/${CONGRESS}/${session}?api_key=${API_KEY}&page=${page}&pageSize=${pageSize}`;
    console.log(`  Fetching vote list page ${page} for session ${session}...`);

    const data = await fetchJSON(url);
    const votes = data?.votes || data?.results || data?.houseVotes || [];

    if (!Array.isArray(votes) || votes.length === 0) {
      break;
    }

    allVotes = allVotes.concat(
      votes.map((v) => ({
        session,
        voteNumber: v.voteNumber || v.rollNumber || v.roll || v.number,
      }))
    );

    const pagination = data.pagination || data.meta || {};
    const totalPages = pagination.totalPages || pagination.total_pages || null;
    if (!totalPages || page >= totalPages) break;
    page++;
  }

  console.log(
    `Discovered ${allVotes.length} roll calls for Congress ${CONGRESS}, session ${session}.`
  );
  return allVotes;
}

async function fetchMembersForVote(session, voteNumber) {
  let page = 1;
  const pageSize = 250;
  let members = [];

  while (true) {
    const url = `${BASE_URL}/house-vote/${CONGRESS}/${session}/${voteNumber}/members?api_key=${API_KEY}&page=${page}&pageSize=${pageSize}`;
    const data = await fetchJSON(url);

    const chunk =
      data?.members ||
      data?.results ||
      data?.votePositions ||
      data?.positions ||
      [];

    if (!Array.isArray(chunk) || chunk.length === 0) break;

    members = members.concat(chunk);

    const pagination = data.pagination || data.meta || {};
    const totalPages = pagination.totalPages || pagination.total_pages || null;
    if (!totalPages || page >= totalPages) break;
    page++;
  }

  return members;
}

function normalizePosition(raw) {
  if (!raw) return "missed";
  const v = String(raw).trim().toLowerCase();
  if (v === "yea" || v === "yes" || v === "aye") return "yea";
  if (v === "nay" || v === "no") return "nay";
  // present, not voting, unknown, etc.
  return "missed";
}

async function aggregateVotesByMember(reps) {
  // Initialize counts for every current rep
  const counts = new Map();
  for (const r of reps) {
    const bioguide = r.id?.bioguide;
    if (!bioguide) continue;
    counts.set(bioguide, { yea: 0, nay: 0, missed: 0 });
  }

  let totalRollCalls = 0;

  for (const session of SESSIONS) {
    const votes = await fetchAllHouseVotesForSession(session);

    for (const v of votes) {
      if (!v.voteNumber) continue;
      totalRollCalls++;

      const members = await fetchMembersForVote(session, v.voteNumber);
      for (const m of members) {
        const bioguide =
          m.bioguideId ||
          m.bioguide_id ||
          m.memberId ||
          m.member_id ||
          null;

        if (!bioguide || !counts.has(bioguide)) continue;

        const pos =
          m.votePosition ||
          m.vote_position ||
          m.position ||
          m.vote ||
          m.cast ||
          null;

        const norm = normalizePosition(pos);
        const c = counts.get(bioguide);

        if (norm === "yea") c.yea++;
        else if (norm === "nay") c.nay++;
        else c.missed++;
      }
    }
  }

  console.log(`Total roll calls processed across all sessions: ${totalRollCalls}`);
  return counts;
}

function buildOutput(reps, counts) {
  const output = [];

  for (const r of reps) {
    const bioguide = r.id?.bioguide;
    if (!bioguide) continue;

    const c = counts.get(bioguide) || { yea: 0, nay: 0, missed: 0 };
    const total = c.yea + c.nay + c.missed;

    const participationPct =
      total > 0 ? +(((c.yea + c.nay) / total) * 100).toFixed(2) : 0;
    const missedVotePct =
      total > 0 ? +((c.missed / total) * 100).toFixed(2) : 0;

    output.push({
      bioguideId: bioguide,
      votes: {
        yeaVotes: c.yea,
        nayVotes: c.nay,
        missedVotes: c.missed,
        totalVotes: total,
        participationPct,
        missedVotePct,
      },
    });
  }

  return output;
}

async function main() {
  console.log("Starting votes-reps-scraper.js for FULL 119th Congress House record...");

  const reps = loadHouseRoster();
  console.log(`Loaded ${reps.length} current House members from legislators-current.json`);

  const counts = await aggregateVotesByMember(reps);
  const output = buildOutput(reps, counts);

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
  console.log(`Wrote ${output.length} representative vote records to ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error("votes-reps-scraper.js failed:", err);
  process.exit(1);
});
