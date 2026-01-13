// scripts/senators-committees.js
const fs = require('fs');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

const OUTPUT = 'public/senators-rankings.json';
const base = JSON.parse(fs.readFileSync(OUTPUT, 'utf8'));

function normalizeName(n) {
  return String(n).toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ').trim();
}

const byFullName = new Map(base.map(s => [normalizeName(s.name), s]));
const byLastNameState = new Map(
  base.map(s => {
    const parts = s.name.split(' ');
    const last = normalizeName(parts[parts.length - 1]);
    return [`${last}|${s.state}`, s];
  })
);

async function fetchPage(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return await res.text();
}

function extractCommitteeAssignments($, row) {
  const tds = $(row).find('td');
  if (tds.length < 2) return null;

  const senatorCell = $(tds[0]).text().trim();
  const match = senatorCell.match(/^(.+?)\s+

\[[DRI]-([A-Z]{2})\]

/);
  if (!match) return null;
  const rawName = match[1].trim();
  const state = match[2];

  const committees = $(tds[1]).text().trim().split('|').map(s => s.trim());

  return { rawName, state, committees };
}

function matchSenator(rawName, state) {
  const parts = rawName.split(',').map(p => p.trim());
  let candidateName = rawName;
  if (parts.length >= 2) {
    const last = parts[0];
    const first = parts[1].replace(/\s+[A-Z]\.?$/, '');
    candidateName = `${first} ${last}`;
  }
  const normFull = normalizeName(candidateName);

  if (byFullName.has(normFull)) return byFullName.get(normFull);

  const last = normalizeName(candidateName.split(' ').pop());
  const key = `${last}|${state}`;
  if (byLastNameState.has(key)) return byLastNameState.get(key);

  for (const [k, sen] of byFullName.entries()) {
    if (k.includes(normFull) && sen.state === state) return sen;
  }
  return null;
}

async function main() {
  const html = await fetchPage('https://www.congress.gov/committees');
  const $ = cheerio.load(html);

  const rows = $('table tbody tr');
  rows.each((i, row) => {
    const data = extractCommitteeAssignments($, row);
    if (!data) return;

    const sen = matchSenator(data.rawName, data.state);
    if (!sen) return;

    sen.committees = data.committees;
  });

  fs.writeFileSync(OUTPUT, JSON.stringify(base, null, 2));
  console.log('senators-rankings.json updated with committees!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
