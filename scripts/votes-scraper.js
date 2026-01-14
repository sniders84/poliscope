/**
 * Votes scraper (Senate-only, Congress.gov API)
 * - Uses /rollcallvote endpoint with item=members
 * - Aggregates total votes, missed votes per senator
 * - Outputs public/senators-votes.json
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = process.env.CONGRESS_API_KEY;
const CONGRESS = process.env.CONGRESS_NUMBER || '119';
const OUT_PATH = path.join('public', 'senators-votes.json');

if (!API_KEY) throw new Error('Missing CONGRESS_API_KEY env.');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function getJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function fetchAllPages(baseUrl) {
  const results = [];
  let page = 1;
  while (true) {
    const url = `${baseUrl}&page=${page}`;
    const json = await getJson(url);
    const items = json?.data || [];
    results.push(...items);
    if (page >= (json?.pagination?.pages || 1)) break;
    page++;
    await sleep(200);
  }
  return results;
}

function initTotals() { return { totalVotes: 0, missedVotes: 0, missedVotePct: 0 }; }

async function run() {
  console.log(`Votes scraper: Congress=${CONGRESS}, chamber=Senate`);
  const totals = new Map();
  const ensure = (id) => { if (!totals.has(id)) totals.set(id, initTotals()); return totals.get(id); };

  const sessions = [1, 2];
  for (const session of sessions) {
    const rollcalls = await fetchAllPages(
      `https://api.congress.gov/v3/rollcallvote?format=json&congress=${CONGRESS}&chamber=Senate&session=${session}&api_key=${API_KEY}`
    );
    console.log(`Fetched Senate roll call votes (session ${session}): ${rollcalls.length}`);

    for (const rc of rollcalls) {
      const members = await getJson(
        `https://api.congress.gov/v3/rollcallvote/${CONGRESS}/Senate/${session}/${rc.rollNumber}/members?format=json&api_key=${API_KEY}`
      );
      for (const m of members?.data || []) {
        const id = m.bioguideId;
        if (!id) continue;
        const t = ensure(id);
        t.totalVotes++;
        if (m.votePosition === 'Not Voting') {
          t.missedVotes++;
        }
      }
    }
  }

  for (const [id, t] of totals.entries()) {
    t.missedVotePct = t.totalVotes > 0 ? +(100 * t.missedVotes / t.totalVotes).toFixed(2) : 0;
  }

  const results = Array.from(totals.entries()).map(([bioguideId, t]) => ({ bioguideId, ...t }));
  fs.writeFileSync(OUT_PATH, JSON.stringify
