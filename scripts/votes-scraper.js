/**
 * Congress.gov votes scraper (cloud-only, Senate-only)
 * - Fetches roll call votes for the given Congress
 * - Aggregates total votes, missed votes per senator (bioguideId)
 * - Outputs public/senators-votes.json
 *
 * Env:
 *   CONGRESS_GOV_API_KEY (required)
 *   CONGRESS_NUMBER (defaults to 119)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = process.env.CONGRESS_GOV_API_KEY;
const CONGRESS = process.env.CONGRESS_NUMBER || '119';
const OUT_PATH = path.join('public', 'senators-votes.json');

if (!API_KEY) throw new Error('Missing CONGRESS_GOV_API_KEY env.');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function getJson(url, retries = 3, backoffMs = 500) {
  return new Promise((resolve, reject) => {
    const attempt = (n) => {
      https.get(url, (res) => {
        let data = '';
        res.on('data', (c) => data += c);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try { resolve(JSON.parse(data)); }
            catch (e) { reject(new Error(`JSON parse error: ${e.message}`)); }
          } else if (n < retries) {
            setTimeout(() => attempt(n + 1), backoffMs * (n + 1));
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 200)}`));
          }
        });
      }).on('error', (err) => {
        if (n < retries) setTimeout(() => attempt(n + 1), backoffMs * (n + 1));
        else reject(err);
      });
    };
    attempt(0);
  });
}

async function fetchAllPages(baseUrl) {
  const results = [];
  let page = 1;
  while (true) {
    const url = `${baseUrl}&page=${page}`;
    const json = await getJson(url);
    const items = json?.data || json?.votes || [];
    results.push(...items);

    const pages = json?.pagination?.pages || 1;
    const current = json?.pagination?.page || page;
    if (current >= pages) break;
    page++;
    await sleep(200);
  }
  return results;
}

function bioguide(member) {
  return member?.bioguideId || member?.bioguide_id || null;
}

function initTotals() {
  return { totalVotes: 0, missedVotes: 0, missedVotePct: 0 };
}

async function run() {
  console.log(`Congress.gov votes aggregation: Congress=${CONGRESS}, chamber=Senate`);

  const votesBase = `https://api.congress.gov/v3/rollcallvote?format=json&congress=${CONGRESS}&chamber=Senate&api_key=${API_KEY}`;
  const rollcalls = await fetchAllPages(votesBase);
  console.log(`Fetched Senate roll call votes: ${rollcalls.length}`);

  const totals = new Map();

  const ensure = (id) => {
    if (!totals.has(id)) totals.set(id, initTotals());
    return totals.get(id);
  };

  for (const rc of rollcalls) {
    const members = rc?.members || [];
    for (const m of members) {
      const id = bioguide(m);
      if (!id) continue;
      const t = ensure(id);
      t.totalVotes++;
      if (m?.votePosition === 'Not Voting') {
        t.missedVotes++;
      }
    }
  }

  // Calculate percentages
  for (const [id, t] of totals.entries()) {
    t.missedVotePct = t.totalVotes > 0 ? +(100 * t.missedVotes / t.totalVotes).toFixed(2) : 0;
  }

  const results = Array.from(totals.entries()).map(([bioguideId, t]) => ({ bioguideId, ...t }));

  const publicDir = path.join('public');
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

  fs.writeFileSync(OUT_PATH, JSON.stringify(results, null, 2));
  console.log(`Wrote ${OUT_PATH} with ${results.length} senator entries.`);
}

run().catch((err) => {
  console.error('Votes scraper failed:', err);
  process.exit(1);
});
