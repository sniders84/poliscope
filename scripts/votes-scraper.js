// scripts/votes-scraper.js
// Full replacement — Senate roll call scraper for 119th Congress
// Scrapes ALL roll calls, stores per‑vote data with dates, maps LIS → bioguideId

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const xml2js = require('xml2js');

const ROSTER_PATH = path.join(__dirname, '../public/legislators-current.json');
const OUTPUT_PATH = path.join(__dirname, '../public/senators-votes.json');

const parser = new xml2js.Parser({
  explicitArray: false,
  mergeAttrs: true,
  tagNameProcessors: [xml2js.processors.stripPrefix],
  attrNameProcessors: [xml2js.processors.stripPrefix]
});

// Load roster
const roster = JSON.parse(fs.readFileSync(ROSTER_PATH, 'utf-8'));
const senators = roster.filter(r => r.terms?.at(-1)?.type === 'sen');

// Build LIS → bioguide map using all senators
function buildLisMap() {
  const map = new Map();
  for (const s of senators) {
    const lis = s.id?.lis;
    const bioguide = s.id?.bioguide;
    if (lis && bioguide) map.set(lis, bioguide);
  }
  return map;
}

// Fetch XML safely
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

// Discover how many roll calls exist for a session
async function discoverMaxRollCall(session) {
  let low = 1;
  let high = 600; // safe upper bound
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
  console.log('Building LIS → bioguide map…');
  const lisMap = buildLisMap();

  const allVotes = [];
  let totalRollCalls = 0;

  for (const session of [1, 2]) {
    console.log(`Discovering roll calls for session ${session}…`);
    const maxRoll = await discoverMaxRollCall(session);
    console.log(`Session ${session}: ${maxRoll} roll calls found`);

    for (let num = 1; num <= maxRoll; num++) {
      const padded = num.toString().padStart(5, '0');
      const url = `https://www.senate.gov/legislative/LIS/roll_call_votes/vote119/vote_119_${session}_${padded}.xml`;

      const parsed = await fetchXML(url);
      if (!parsed) continue;

      totalRollCalls++;

      const rc = parsed.roll_call_vote;
      const date = rc.vote_date || null;
      const question = rc.question || '';
      const result = rc.result || '';
      const members = rc.members?.member || [];

      for (const m of members) {
        const lis = m.lis_member_id;
        const bioguide = lisMap.get(lis);
        if (!bioguide) continue;

        const voteCast = (m.vote_cast || '').trim();

        allVotes.push({
          bioguideId: bioguide,
          date,
          session,
          rollNumber: num,
          vote: voteCast,
          question,
          result
        });
      }
    }
  }

  // Group by senator
  const grouped = {};
  for (const s of senators) {
    grouped[s.id.bioguide] = {
      bioguideId: s.id.bioguide,
      name: `${s.name.first} ${s.name.last}`,
      votes: []
    };
  }

  for (const v of allVotes) {
    if (grouped[v.bioguideId]) {
      grouped[v.bioguideId].votes.push(v);
    }
  }

  const output = Object.values(grouped);

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
  console.log(`Wrote ${output.length} senator vote records to ${OUTPUT_PATH}`);
  console.log(`Total roll calls processed: ${totalRollCalls}`);
}

main().catch(err => console.error('Votes failed:', err.message));
