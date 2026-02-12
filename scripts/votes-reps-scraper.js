// scripts/votes-reps-scraper.js
// Purpose: Scrape House roll call votes for the 119th Congress
// Output schema preserved EXACTLY as before:
// [
//   {
//     bioguideId: "A000360",
//     votes: {
//       yeaVotes: 0,
//       nayVotes: 0,
//       missedVotes: 0,
//       totalVotes: 0,
//       participationPct: 0,
//       missedVotePct: 0
//     }
//   },
//   ...
// ]

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const xml2js = require('xml2js');

const ROSTER_PATH = path.join(__dirname, '../public/legislators-current.json');
const OUTPUT_PATH = path.join(__dirname, '../public/representatives-votes.json');

const parser = new xml2js.Parser({
  explicitArray: false,
  mergeAttrs: true,
  tagNameProcessors: [xml2js.processors.stripPrefix],
  attrNameProcessors: [xml2js.processors.stripPrefix]
});

// Load roster and filter to current House members
const roster = JSON.parse(fs.readFileSync(ROSTER_PATH, 'utf-8'));
const reps = roster.filter(r => r.terms?.at(-1)?.type === 'rep');

// Build ICPSR → bioguide map
function buildIcpsrMap() {
  const map = new Map();
  for (const r of reps) {
    const icpsr = r.id?.icpsr;
    const bioguide = r.id?.bioguide;
    if (icpsr && bioguide) {
      map.set(String(icpsr), bioguide);
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

// Discover max roll call number for a given session via binary search
async function discoverMaxRollCall(session) {
  let low = 1;
  let high = 1200; // safe upper bound for House
  let max = 0;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const padded = mid.toString().padStart(4, '0');
    const url = `https://clerk.house.gov/evs/2025/roll${padded}.xml`;

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
  console.log('Starting votes-reps-scraper.js');
  console.log(`Loaded ${reps.length} representatives`);

  const icpsrMap = buildIcpsrMap();

  // Initialize aggregate counts per rep
  const voteCounts = {};
  reps.forEach(r => {
    const bioguide = r.id?.bioguide;
    if (!bioguide) return;
    voteCounts[bioguide] = { yea: 0, nay: 0, missed: 0 };
  });

  console.log('Discovering House roll calls for 2025...');
  const maxRoll = await discoverMaxRollCall(1);
  console.log(`Discovered ${maxRoll} roll calls`);

  let processed = 0;

  for (let num = 1; num <= maxRoll; num++) {
    const padded = num.toString().padStart(4, '0');
    const url = `https://clerk.house.gov/evs/2025/roll${padded}.xml`;

    const parsed = await fetchXML(url);
    if (!parsed) continue;

    processed++;

    const rc = parsed.rollcall || parsed.rollCall || parsed.roll_call_vote;
    if (!rc) continue;

    const members = rc.vote_data?.recorded_vote || rc.members?.member || [];
    const arr = Array.isArray(members) ? members : [members];

    for (const m of arr) {
      const icpsr = m.icpsr || m.icpsr_id || m.icpsrId;
      const bioguide = icpsrMap.get(String(icpsr));
      if (!bioguide || !voteCounts[bioguide]) continue;

      const voteCast = (m.vote || m.vote_cast || '').trim();
      const counts = voteCounts[bioguide];

      if (/yea/i.test(voteCast)) counts.yea++;
      else if (/nay/i.test(voteCast)) counts.nay++;
      else counts.missed++;
    }
  }

  // Build output in the ORIGINAL expected schema
  const output = reps.map(r => {
    const bioguide = r.id?.bioguide;
    const counts = voteCounts[bioguide] || { yea: 0, nay: 0, missed: 0 };
    const total = counts.yea + counts.nay + counts.missed;

    const participationPct =
      total > 0 ? +(((counts.yea + counts.nay) / total) * 100).toFixed(2) : 0;
    const missedVotePct =
      total > 0 ? +((counts.missed / total) * 100).toFixed(2) : 0;

    return {
      bioguideId: bioguide,
      votes: {
        yeaVotes: counts.yea,
        nayVotes: counts.nay,
        missedVotes: counts.missed,
        totalVotes: total,
        participationPct,
        missedVotePct
      }
    };
  });

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
  console.log(`Wrote ${output.length} representative vote records to ${OUTPUT_PATH}`);
  console.log(`Total roll calls processed: ${processed}`);
}

main().catch(err => console.error(err));
