// scripts/senators-legislation.js
const fs = require('fs');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

const URL = 'https://www.congress.gov/sponsors-cosponsors/119th-congress/senators/all';
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

function parseIntSafe(text) {
  const m = String(text || '').match(/\d+/);
  return m ? parseInt(m[0], 10) : 0;
}

async function fetchPage(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return await res.text();
}

// Parse "Last, First M. [D-XX]" without regex
function parseSenatorCell(cellText) {
  const t = String(cellText || '').trim();
  const lb = t.lastIndexOf('[');
  const rb = t.lastIndexOf(']');
  if (lb === -1 || rb === -1 || rb < lb) return null;

  const namePart = t.slice(0, lb).trim();
  const bracket = t.slice(lb + 1, rb).trim(); // e.g., "D-MD"
  const dash = bracket.indexOf('-');
  if (dash === -1) return null;

  const state = bracket.slice(dash + 1).trim(); // "MD"
  return { rawName: namePart, state };
}

function extractCountsFromRow($, row) {
  const tds = $(row).find('td');
  if (tds.length < 4) return null;

  // Senator cell
  const senatorCell = $(tds[0]).text().trim();
  const parsed = parseSenatorCell(senatorCell);
  if (!parsed) return null;
  const { rawName, state } = parsed;

  // Sponsored: "Bills | Amendments | Total"
  const sponsoredParts = $(tds[1]).text().trim().split('|').map(s => s.trim());
  const sponsoredLegislation = parseIntSafe(sponsoredParts[0]);     // bills + resolutions
  const sponsoredAmendments = parseIntSafe(sponsoredParts[1]);      // amendments

  // Cosponsored Bills: "Original | Withdrawn | Total"
  const cosBillsParts = $(tds[2]).text().trim().split('|').map(s => s.trim());
  const cosponsoredLegislation = parseIntSafe(cosBillsParts[2]);    // All/Total

  // Cosponsored Amendments: "Original | Withdrawn" → total = original + withdrawn
  const cosAmendsParts = $(tds[3]).text().trim().split('|').map(s => s.trim());
  const cosAmendsOriginal = parseIntSafe(cosAmendsParts[0]);
  const cosAmendsWithdrawn = parseIntSafe(cosAmendsParts[1]);
  const cosponsoredAmendments = cosAmendsOriginal + cosAmendsWithdrawn;

  return {
    rawName,
    state,
    sponsoredLegislation,
    sponsoredAmendments,
    cosponsoredLegislation,
    cosponsoredAmendments
  };
}

function matchSenator(rawName, state) {
  // Convert "Last, First M." → "First Last"
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
  const html = await fetchPage(URL);
  const $ = cheerio.load(html);

  const rows = $('table tbody tr');
  let matched = 0, unmatched = 0;

  rows.each((i, row) => {
    const counts = extractCountsFromRow($, row);
    if (!counts) return;

    const sen = matchSenator(counts.rawName, counts.state);
    if (!sen) { unmatched++; return; }

    sen.sponsoredLegislation = counts.sponsoredLegislation;
    sen.sponsoredAmendments = counts.sponsoredAmendments;
    sen.cosponsoredLegislation = counts.cosponsoredLegislation;
    sen.cosponsoredAmendments = counts.cosponsoredAmendments;
    matched++;
  });

  fs.writeFileSync(OUTPUT, JSON.stringify(base, null, 2));
  console.log(`senators-rankings.json updated with legislation! Matched: ${matched}, Unmatched: ${unmatched}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
