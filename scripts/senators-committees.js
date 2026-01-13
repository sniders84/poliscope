// scripts/senators-committees.js
const fs = require('fs');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

const OUTPUT = 'public/senators-rankings.json';
// Added check to ensure file exists before reading
if (!fs.existsSync(OUTPUT)) {
    fs.writeFileSync(OUTPUT, JSON.stringify([]));
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

async function fetchPage(url) {
  const res = await fetch(url, { 
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' } 
  });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return await res.text();
}

function extractCommitteeAssignments($, row) {
  const tds = $(row).find('td');
  if (tds.length < 2) return null;

  // Clean up whitespace and newlines
  const senatorCell = $(tds[0]).text().replace(/\s+/g, ' ').trim();
  
  // Improved Regex: Handles names and [Party-State] format
  // Example: "Sanders, Bernard [I-VT]" or "Whitehouse, Sheldon [D-RI]"
  const match = senatorCell.match(/^([^\[]+)\s+\[([DRI])-([A-Z]{2})\]/);
  
  if (!match) return null;
  
  const rawName = match[1].trim();
  const state = match[3];

  // Assuming committees are separated by commas or list items
  const committees = $(tds[1]).text().trim().split('\n').map(s => s.trim()).filter(s => s);

  return { rawName, state, committees };
}

function matchSenator(rawName, state) {
  // Handle "Last, First" format
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

  // Partial match fallback
  for (const [k, sen] of byFullName.entries()) {
    if ((k.includes(last) || last.includes(k)) && sen.state === state) return sen;
  }
  return null;
}

async function main() {
  // Note: Ensure this URL contains the member table you expect
  // Congress.gov often requires specific search parameters for member lists
  const url = 'https://www.congress.gov/members?q=%7B%22chamber%22%3A%22Senate%22%7D';
  console.log(`Fetching ${url}...`);
  
  const html = await fetchPage(url);
  const $ = cheerio.load(html);

  // Updated selector to find member rows specifically
  const rows = $('.expanded-view.search-column li'); 
  
  rows.each((i, row) => {
    // Note: The structure of the members page is usually a <ul> list, not a <table>
    // If you are scraping a table, keep your tr selector.
    const nameText = $(row).find('.result-title').text();
    // ... logic to parse committees from member detail page if needed
  });

  // For now, let's stick to your table logic but add error logging
  let updatedCount = 0;
  $('table tbody tr').each((i, row) => {
    const data = extractCommitteeAssignments($, row);
    if (!data) return;

    const sen = matchSenator(data.rawName, data.state);
    if (sen) {
      sen.committees = data.committees;
      updatedCount++;
    } else {
      console.warn(`Could not match: ${data.rawName} (${data.state})`);
    }
  });

  fs.writeFileSync(OUTPUT, JSON.stringify(base, null, 2));
  console.log(`Finished! Updated ${updatedCount} senators in ${OUTPUT}`);
}

main().catch(err => {
  console.error('Error running scraper:', err);
  process.exit(1);
});
