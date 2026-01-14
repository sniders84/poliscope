/**
 * Votes scraper (Congress.gov API v3)
 * - Fetches Senate roll call votes
 * - Aggregates total and missed votes per senator
 * - Outputs public/senators-votes.json
 */

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const OUT_PATH = path.join('public', 'senators-votes.json');
const API_KEY = process.env.CONGRESS_API_KEY;
const CONGRESS = process.env.CONGRESS_NUMBER || '119';

function initTotals() { return { totalVotes: 0, missedVotes: 0, missedVotePct: 0 }; }

async function fetchVotes(session) {
  const url = `https://api.congress.gov/v3/senate-vote/${CONGRESS}/${session}`;
  const res = await fetch(url, { headers: { 'X-API-Key': API_KEY } });
  if (!res.ok) throw new Error(`Failed ${url}: ${res.status}`);
  return await res.json();
}

async function run() {
  console.log(`Votes scraper: Congress=${CONGRESS}, chamber=Senate`);

  const totals = new Map();

  for (const session of [1, 2]) {
    const data = await fetchVotes(session);
    for (const v of data.votes || []) {
      for (const m of v.members || []) {
        const id = m.bioguideId;
        if (!id) continue;
        if (!totals.has(id)) totals.set(id, initTotals());

        const t = totals.get(id);
        t.totalVotes++;
        if (m.vote === 'Not Voting') t.missedVotes++;
      }
    }
  }

  for (const [id, t] of totals.entries()) {
    t.missedVotePct = t.totalVotes > 0 ? +(100 * t.missedVotes / t.totalVotes).toFixed(2) : 0;
  }

  const results = Array.from(totals.entries()).map(([bioguideId, t]) => ({ bioguideId, ...t }));
  if (results.length === 0) {
    console.log("No data, skipping write.");
    return;
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(results, null, 2));
  console.log(`Wrote ${OUT_PATH} with ${results.length} senator entries.`);
}

run().catch(err => { console.error(err); process.exit(1); });
