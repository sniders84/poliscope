// scripts/senators-legislation.js
const fs = require('fs');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

const URL = 'https://www.congress.gov/sponsors-cosponsors/119th-congress/senators/all';
const OUTPUT = 'public/senators-rankings.json';

if (!fs.existsSync(OUTPUT)) {
  console.error("Error: Base JSON file not found.");
  process.exit(1);
}
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

/**
 * Robustly extract the first number found in a string.
 * This is safer than splitting by specific characters.
 */
function extractFirstNumber(text) {
  const match = text.replace(/,/g, '').match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

async function fetchPage(url) {
  const res = await fetch(url, { 
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' } 
  });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return await res.text();
}

function extractCountsFromRow($, row) {
  const tds = $(row).find('td');
  if (tds.length < 4) return null;

  // 1. Parse Senator Name and State
  const senatorCell = $(tds[0]).text().replace(/\s+/g, ' ').trim();
  const nameMatch = senatorCell.match(/^([^\[]+)\s+\[([DRI])-([A-Z]{2})\]/);
  
  if (!nameMatch) return null;
  const rawName = nameMatch[1].trim();
  const state = nameMatch[3];

  // 2. Parse Sponsored Legislation (Column 2)
  // Usually looks like: "10 (8 bills, 2 amendments)"
  const sponsoredCell = $(tds[1]).text().trim();
  const sponsoredLegislation = extractFirstNumber(sponsoredCell);
  
  // 3. Parse Cosponsored Legislation (Column 3)
  const cosponsoredLegislation = extractFirstNumber($(tds[2]).text().trim());

  // 4. Parse Cosponsored Amendments (Column 4)
  const cosponsoredAmendments = extractFirstNumber($(tds[3]).text().trim());

  return { 
    rawName, 
    state, 
    sponsoredLegislation, 
    cosponsoredLegislation, 
    cosponsoredAmendments 
  };
}

function matchSenator(rawName, state) {
  let candidateName = rawName;
  if (rawName.includes(',')) {
    const [last, first] = rawName.split(',').map(p => p.trim());
    candidateName = `${first} ${last}`;
  }
  
  const normFull = normalizeName(candidateName);
  if (byFullName.has(normFull)) return byFullName.get(normFull);

  const parts = candidateName.split(' ');
  const last = normalizeName(parts[parts.length - 1]);
  const key = `${last}|${state}`;
  
  if (byLastNameState.has(key)) return byLastNameState.get(key);

  return null;
}

async function main() {
  console.log(`Fetching legislation data from ${URL}...`);
  const html = await fetchPage(URL);
  const $ = cheerio.load(html);

  const rows = $('table.item_table tbody tr, table.item-table tbody tr');
  let matched = 0, unmatched = 0;

  rows.each((i, row) => {
    const counts = extractCountsFromRow($, row);
    if (!counts) return;

    const sen = matchSenator(counts.rawName, counts.state);
    if (!sen) { 
      console.warn(`Could not match Senator: ${counts.rawName} [${counts.state}]`);
      unmatched++; 
      return; 
    }

    // Update the base object reference
    sen.sponsoredLegislation = counts.sponsoredLegislation;
    sen.cosponsoredLegislation = counts.cosponsoredLegislation;
    sen.cosponsoredAmendments = counts.cosponsoredAmendments;
    matched++;
  });

  fs.writeFileSync(OUTPUT, JSON.stringify(base, null, 2));
  console.log(`\nSuccess!`);
  console.log(`Matched: ${matched}`);
  console.log(`Unmatched: ${unmatched}`);
  console.log(`File updated: ${OUTPUT}`);
}

main().catch(err => {
  console.error("Fatal Error:", err.message);
  process.exit(1);
});
