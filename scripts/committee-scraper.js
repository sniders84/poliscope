/**
 * Committee scraper
 * - Uses /member endpoint to pull committee assignments
 * - Captures leadership flags (Chair, Ranking Member)
 * - Outputs public/senators-committees.json
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = process.env.CONGRESS_API_KEY;
const CONGRESS = process.env.CONGRESS_NUMBER || '119';
const OUT_PATH = path.join('public', 'senators-committees.json');

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

async function run() {
  console.log(`Committee scraper: Congress=${CONGRESS}, chamber=Senate`);
  const senators = await fetchAllPages(
    `https://api.congress.gov/v3/member?format=json&chamber=Senate&congress=${CONGRESS}&api_key=${API_KEY}`
  );

  const results = [];

  for (const s of senators) {
    const id = s.bioguideId;
    if (!id) continue;

    const committees = await fetchAllPages(
      `https://api.congress.gov/v3/member/${id}/committees?format=json&congress=${CONGRESS}&api_key=${API_KEY}`
    );

    const mapped = committees.map(c => ({
      committee: c.name,
      role: c.role || 'Member'
    }));

    results.push({ bioguideId: id, committees: mapped });
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(results, null, 2));
  console.log(`Wrote ${OUT_PATH} with ${results.length} senator entries.`);
}

run().catch(e => { console.error('Committee scraper failed:', e); process.exit(1); });
