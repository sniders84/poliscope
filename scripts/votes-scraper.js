/**
 * Votes scraper (Senate.gov XML)
 * - Fetches Senate roll call votes from XML index
 * - Aggregates total and missed votes per senator
 * - Outputs public/senators-votes.json
 */

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const xml2js = require('xml2js');

const OUT_PATH = path.join('public', 'senators-votes.json');
const CONGRESS = process.env.CONGRESS_NUMBER || '119';

function initTotals() { return { totalVotes: 0, missedVotes: 0, missedVotePct: 0 }; }

async function fetchRollCallIndex(session) {
  const url = `https://www.senate.gov/legislative/LIS/roll_call_votes/vote${CONGRESS}${session}/rollcall.xml`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed ${url}: ${res.status}`);
  const text = await res.text();
  return await xml2js.parseStringPromise(text);
}

async function run() {
  console.log(`Votes scraper: Congress=${CONGRESS}, chamber=Senate`);

  const totals = new Map();

  for (const session of ['1', '2']) {
    const data = await fetchRollCallIndex(session);
    const votes = data.rollcalls?.vote || [];
    for (const v of votes) {
      const members = v.members?.[0]?.member || [];
      for (const m of members) {
        const id = m.$.id;
        if (!id) continue;
        if (!totals.has(id)) totals.set(id, initTotals());

        const t = totals.get(id);
        t.totalVotes++;
        if (m.vote[0] === 'Not Voting') t.missedVotes++;
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
