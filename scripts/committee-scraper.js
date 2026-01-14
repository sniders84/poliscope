/**
 * Committee scraper (Congress.gov API v3)
 * - Fetches Senate committees list, then per-committee detail to get members
 * - Outputs public/senators-committees.json
 */

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const OUT_PATH = path.join('public', 'senators-committees.json');
const API_KEY = process.env.CONGRESS_API_KEY;
const CONGRESS = process.env.CONGRESS_NUMBER || '119';

async function fetchCommitteesList() {
  const url = `https://api.congress.gov/v3/committee/${CONGRESS}/Senate`;
  const res = await fetch(url, { headers: { 'X-API-Key': API_KEY } });
  if (!res.ok) throw new Error(`Failed ${url}: ${res.status}`);
  const data = await res.json();
  return data.committees || [];
}

async function fetchCommitteeDetail(code) {
  const url = `https://api.congress.gov/v3/committee/${CONGRESS}/Senate/${code}`;
  const res = await fetch(url, { headers: { 'X-API-Key': API_KEY } });
  if (!res.ok) throw new Error(`Failed ${url}: ${res.status}`);
  const data = await res.json();
  return data.committee || {};
}

async function run() {
  console.log(`Committee scraper: Congress=${CONGRESS}, chamber=Senate`);

  const list = await fetchCommitteesList();
  const byMember = new Map();

  for (const c of list) {
    const code = c.code || c.committeeCode || c.codeName;
    if (!code) continue;

    let detail;
    try {
      detail = await fetchCommitteeDetail(code);
    } catch (e) {
      console.warn(`Detail fetch failed for ${c.name || code}: ${e.message}`);
      continue;
    }

    const members = detail.members || [];
    for (const m of members) {
      const id = m.bioguideId;
      if (!id) continue;
      const role = m.role || 'Member';
      const entry = byMember.get(id) || { bioguideId: id, committees: [] };
      entry.committees.push({ committee: detail.name || c.name || code, role });
      byMember.set(id, entry);
    }
  }

  const results = Array.from(byMember.values());
  if (results.length === 0) {
    console.log("No data, skipping write.");
    return;
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(results, null, 2));
  console.log(`Wrote ${OUT_PATH} with ${results.length} senator entries.`);
}

run().catch(err => { console.error(err); process.exit(1); });
