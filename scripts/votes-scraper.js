// scripts/votes-scraper.js
// Purpose: Scrape Senate roll call votes for the 119th Congress (sessions 1 and 2)
// Output schema is FLAT and COMPATIBLE with merge-senators.js:
// [
//   {
//     bioguideId: "A000360",
//     yeaVotes: 0,
//     nayVotes: 0,
//     missedVotes: 0,
//     totalVotes: 0,
//     participationPct: 0,
//     missedVotePct: 0
//   },
//   ...
// ]

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const xml2js = require('xml2js');

const RANKINGS_PATH = path.join(__dirname, '../public/senators-rankings.json');
const INFO_PATH = path.join(__dirname, '../public/senators.json');
const OUTPUT_PATH = path.join(__dirname, '../public/senators-votes.json');

const parser = new xml2js.Parser({
  explicitArray: false,
  mergeAttrs: true,
  tagNameProcessors: [xml2js.processors.stripPrefix],
  attrNameProcessors: [xml2js.processors.stripPrefix]
});

// Load roster (rankings) and info (termStart/termEnd)
const rankings = JSON.parse(fs.readFileSync(RANKINGS_PATH, 'utf-8'));
const info = JSON.parse(fs.readFileSync(INFO_PATH, 'utf-8'));

// Build bioguide -> term window map
function buildTermMap() {
  const map = new Map();
  for (const s of info) {
    const bioguide = s.bioguideId;
    const termStart = s.termStart;
    const termEnd = s.termEnd;
    if (!bioguide || !termStart || !termEnd) continue;
    map.set(bioguide, {
      start: new Date(termStart),
      end: new Date(termEnd)
    });
  }
  return map;
}

// Build LIS → bioguide map from rankings
function buildLisMap() {
  const map = new Map();
  for (const s of rankings) {
    const lis = s.lis;
    const bioguide = s.bioguideId;
    if (lis && bioguide) {
      map.set(lis, bioguide);
    }
  }
  return map;
}

async function fetchXML(url) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) return null;
    const xml = await res.text();
    return await parser.parseStringPromise(xml);
  } catch {
    return null;
  }
}

// Discover max roll call number for a given session
async function discoverMaxRollCall(session) {
  let low = 1;
  let high = 2000;
  let max = 0;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const padded = mid.toString().padStart(5, '0');
    const url = `https://www.senate.gov/legislative/LIS/roll_call_votes/vote119/vote_119_${session}_${padded}.xml`;

    const parsed = await fetchXML(url);
    if (parsed) {
      max = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return max;
}

async function main() {
  console.log('Senate votes scraper (119th Congress) — starting');

  const lisMap = buildLisMap();
  const termMap = buildTermMap();

  // Initialize aggregate counts
  const voteCounts = {};
  rankings.forEach(s => {
    const bioguide = s.bioguideId;
    if (!bioguide) return;
    voteCounts[bioguide] = { yea: 0, nay: 0, missed: 0 };
  });

  let totalRollCalls = 0;

  for (const session of [1, 2]) {
    console.log(`Discovering roll calls for session ${session}...`);
    const maxRoll = await discoverMaxRollCall(session);
    console.log(`Session ${session}: ${maxRoll} roll calls found`);

    for (let num = 1; num <= maxRoll; num++) {
      const padded = num.toString().padStart(5, '0');
      const url = `https://www.senate.gov/legislative/LIS/roll_call_votes/vote119/vote_119_${session}_${padded}.xml`;

      const parsed = await fetchXML(url);
      if (!parsed) continue;

      const rc = parsed?.roll_call_vote || parsed?.rollcallvote;
      if (!rc || !rc.members) continue;

      // Parse vote date once per roll call
      const voteDateStr = rc.vote_date;
      if (!voteDateStr) continue;
      const voteDate = new Date(voteDateStr);
      if (Number.isNaN(voteDate.getTime())) continue;

      totalRollCalls++;

      const members = Array.isArray(rc.members.member)
        ? rc.members.member
        : [rc.members.member];

      for (const m of members) {
        const lis = m.lis_member_id;
        const bioguide = lisMap.get(lis);
        if (!bioguide || !voteCounts[bioguide]) continue;

        const term = termMap.get(bioguide);
        if (!term) continue;

        // Only count votes within the senator's term window
        if (voteDate < term.start || voteDate > term.end) continue;

        const voteCast = (m.vote_cast || '').trim();
        const counts = voteCounts[bioguide];

        if (voteCast === 'Yea') counts.yea++;
        else if (voteCast === 'Nay') counts.nay++;
        else if (voteCast === 'Not Voting') counts.missed++;
      }
    }
  }

  // Build output in FLAT schema
  const output = rankings.map(s => {
    const bioguide = s.bioguideId;
    const counts = voteCounts[bioguide] || { yea: 0, nay: 0, missed: 0 };
    const total = counts.yea + counts.nay + counts.missed;

    const participationPct =
      total > 0 ? +(((counts.yea + counts.nay) / total) * 100).toFixed(2) : 0;
    const missedVotePct =
      total > 0 ? +((counts.missed / total) * 100).toFixed(2) : 0;

    return {
      bioguideId: bioguide,
      yeaVotes: counts.yea,
      nayVotes: counts.nay,
      missedVotes: counts.missed,
      totalVotes: total,
      participationPct,
      missedVotePct
    };
  });

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
  console.log(`Wrote ${output.length} senator vote records to ${OUTPUT_PATH}`);
  console.log(`Total roll calls processed (before term filtering): ${totalRollCalls}`);
}

main().catch(err => console.error('Votes failed:', err.message));
