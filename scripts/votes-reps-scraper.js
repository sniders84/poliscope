// scripts/votes-reps-scraper.js
// Scrape FULL 119th Congress House roll call votes from Congress.gov HTML (both sessions)
// and aggregate per-member stats into public/representatives-votes.json

const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");
const { JSDOM } = require("jsdom");

const CONGRESS = 119;
const SESSIONS = [1, 2];

const ROSTER_PATH = path.join(__dirname, "../public/legislators-current.json");
const OUTPUT_PATH = path.join(__dirname, "../public/representatives-votes.json");

const BASE_LIST_URL = "https://www.congress.gov/votes/house";

async function fetchHTML(url) {
  console.log(`FETCH: ${url}`);
  const res = await fetch(url, {
    headers: {
      "User-Agent": "poliscope/1.0",
      Accept: "text/html",
    },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  return res.text();
}

function loadHouseRoster() {
  const raw = fs.readFileSync(ROSTER_PATH, "utf8");
  const roster = JSON.parse(raw);
  return roster.filter((m) => {
    const lastTerm = m.terms && m.terms[m.terms.length - 1];
    return lastTerm && lastTerm.type === "rep";
  });
}

function normalizeVote(v) {
  if (!v) return "missed";
  const s = String(v).trim().toLowerCase();
  if (s === "yea" || s === "aye" || s === "yes") return "yea";
  if (s === "nay" || s === "no") return "nay";
  // present, not voting, etc.
  return "missed";
}

function extractBioguideFromCell(cell) {
  const link = cell.querySelector("a[href*='/member/']");
  if (!link) return null;
  try {
    const href = link.getAttribute("href") || "";
    // examples: /member/alma-adams/A000370
    const parts = href.split("/").filter(Boolean);
    const last = parts[parts.length - 1];
    if (last && /^[A-Z0-9]{7}$/.test(last)) {
      return last;
    }
    return null;
  } catch {
    return null;
  }
}

async function getRollCallUrlsForSession(session) {
  const listUrl = `${BASE_LIST_URL}/${CONGRESS}-${session}`;
  const html = await fetchHTML(listUrl);
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  const anchors = Array.from(doc.querySelectorAll("a[href*='/votes/house/']"));
  const urls = new Set();

  const pattern = new RegExp(`/votes/house/${CONGRESS}-${session}/\\d+/?$`);

  for (const a of anchors) {
    const href = a.getAttribute("href") || "";
    if (pattern.test(href)) {
      const full = href.startsWith("http")
        ? href
        : `https://www.congress.gov${href}`;
      urls.add(full.replace(/\/+$/, "")); // normalize trailing slash
    }
  }

  const result = Array.from(urls).sort((a, b) => {
    const ma = a.match(/(\d+)$/);
    const mb = b.match(/(\d+)$/);
    const na = ma ? parseInt(ma[1], 10) : 0;
    const nb = mb ? parseInt(mb[1], 10) : 0;
    return na - nb;
  });

  console.log(
    `Discovered ${result.length} roll call URLs for Congress ${CONGRESS}, session ${session}.`
  );
  return result;
}

async function parseVotePage(url) {
  const html = await fetchHTML(url);
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  // Find the "All Votes" table: look for a table whose header row has Representative / Party / State / Vote
  const tables = Array.from(doc.querySelectorAll("table"));
  let target = null;

  for (const t of tables) {
    const headers = Array.from(t.querySelectorAll("thead tr th")).map((th) =>
      th.textContent.trim().toLowerCase()
    );
    if (
      headers.length >= 4 &&
      headers[0].includes("representative") &&
      headers[1].includes("party") &&
      headers[2].includes("state") &&
      headers[3].includes("vote")
    ) {
      target = t;
      break;
    }
  }

  if (!target) {
    console.warn(`WARNING: No matching "All Votes" table found on ${url}`);
    return [];
  }

  const rows = Array.from(target.querySelectorAll("tbody tr"));
  const records = [];

  for (const row of rows) {
    const cells = row.querySelectorAll("td");
    if (cells.length < 4) continue;

    const repCell = cells[0];
    const partyCell = cells[1];
    const stateCell = cells[2];
    const voteCell = cells[3];

    const bioguideId = extractBioguideFromCell(repCell);
    const repName = repCell.textContent.trim();
    const party = partyCell.textContent.trim();
    const state = stateCell.textContent.trim();
    const voteRaw = voteCell.textContent.trim();

    records.push({
      bioguideId: bioguideId || null,
      name: repName,
      party,
      state,
      vote: normalizeVote(voteRaw),
    });
  }

  return records;
}

async function aggregateVotesByMember(reps) {
  const counts = new Map();

  // Initialize counts for all current reps
  for (const r of reps) {
    const bioguide = r.id && r.id.bioguide;
    if (!bioguide) continue;
    counts.set(bioguide, { yea: 0, nay: 0, missed: 0 });
  }

  let totalRollCalls = 0;

  for (const session of SESSIONS) {
    const voteUrls = await getRollCallUrlsForSession(session);

    for (const voteUrl of voteUrls) {
      totalRollCalls++;
      console.log(`Processing vote ${voteUrl} ...`);

      const records = await parseVotePage(voteUrl);

      for (const rec of records) {
        const { bioguideId, vote } = rec;

        if (!bioguideId || !counts.has(bioguideId)) {
          // If we can't map to a current rep, skip for aggregation
          continue;
        }

        const c = counts.get(bioguideId);
        if (vote === "yea") c.yea++;
        else if (vote === "nay") c.nay++;
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
    const bioguide = r.id && r.id.bioguide;
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
  console.log(
    "Starting votes-reps-scraper.js for FULL 119th Congress House record via Congress.gov HTML..."
  );

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
