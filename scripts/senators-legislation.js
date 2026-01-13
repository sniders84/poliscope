// scripts/senators-legislation.js
const fs = require('fs');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

const URL = 'https://www.congress.gov/sponsors-cosponsors/119th-congress/senators/all';
const OUTPUT = 'public/senators-rankings.json';

const base = JSON.parse(fs.readFileSync(OUTPUT, 'utf8'));

// Normalize names for matching
function normalizeName(n) {
  return String(n)
    .toLowerCase()
    .replace(/senator\s+/g, '')
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Build lookup maps from base
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

// Extract counts from a table row
function extractCountsFromRow($, row) {
  const tds = $(row).find('td');
  if (tds.length < 4) return null;

  // Column 0: Senator (e.g., "Alsobrooks, Angela D. [D-MD]")
  const senatorCell = $(tds[0]).text().trim();
  const nameRegex = new RegExp('^(.+?)\\s+\

\[[DRI]-([A-Z]{2})\\]

');
  const nameMatch = senatorCell.match(nameRegex);
  if (!nameMatch) return null;
  const rawName = nameMatch[1].trim();
  const state = nameMatch[2];

  // Column 1: Sponsored — "Bills | Amendments | Total"
  const sponsoredCell = $(tds[1]).text().trim();
  const sponsoredParts = sponsoredCell.split('|').map(s => s.trim());
  const sponsoredBills = parseIntSafe(sponsoredParts[0]);       // Bills (includes resolutions)
  const sponsoredAmendments = parseIntSafe(sponsoredParts[1]);  // Amendments

  // Column 2: Cosponsored Bills — "Original | Withdrawn | Total"
  const cosBillsCell = $(tds[2]).text().trim();
  const cosBillsParts = cosBillsCell.split('|').map(s => s.trim());
  const cosponsoredLegislation = parseIntSafe(cosBillsParts[2]); // Total

  // Column 3: Cosponsored Amendments — "Original | Withdrawn"
  const cosAmendsCell = $(tds[3]).text().trim();
  const cosAmendsParts = cosAmendsCell.split('|').map(s => s.trim());
  const cosponsoredAmendments = parseIntSafe(cosAmendsParts[0]); // Original

  return {
    rawName,
    state,
    sponsoredLegislation: sponsoredBills,      // bills + resolutions lumped as “Legislation”
    sponsoredAmendments,
    cosponsoredLegislation,
    cosponsoredAmendments
  };
}

// Convert "Last, First M." → "First Last" and match to base
function matchSenator(rawName, state) {
  const parts = rawName.split(',').map(p => p.trim());
  let candidateName = rawName;
  if (parts.length >= 2) {
    const last = parts[0];
    const first = parts[1].replace(/\s+[A-Z]\.?$/, ''); // drop middle initial
    candidateName = `${first} ${last}`;
  }
  const normFull = normalizeName(candidateName);

  // Try full name match
  if (byFullName.has(normFull)) return byFullName.get(normFull);

  // Try last name + state
  const last = normalizeName(candidateName.split(' ').pop());
  const key = `${last}|${state}`;
  if (byLastNameState.has(key)) return byLastNameState.get(key);

  // Fallback: loose contains match with state guard
  for (const [k, sen] of byFullName.entries()) {
    if (k.includes(normFull) && sen.state === state) return sen;
  }
  return null;
}

async function main() {
  const html = await fetchPage(URL);
  const $ = cheerio.load(html);

  // Guard for table variations
  const rows = $('table tbody tr');
  if (rows.length === 0) {
    console.log('No rows found on Congress.gov sponsors/cosponsors page.');
  }

  let matched = 0, unmatched = 0;

  rows.each((i, row) => {
    const counts = extractCountsFromRow($, row);
    if (!counts) return;

    const sen = matchSenator(counts.rawName, counts.state);
    if (!sen) {
      unmatched++;
      return;
    }

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
