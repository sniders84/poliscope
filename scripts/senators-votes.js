// scripts/senators-votes.js
const fs = require('fs');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

const OUTPUT = 'public/senators-rankings.json';

// 1. Load base data
if (!fs.existsSync(OUTPUT)) {
    console.error(`Error: ${OUTPUT} not found. Run the main scraper first.`);
    process.exit(1);
}
const base = JSON.parse(fs.readFileSync(OUTPUT, 'utf8'));

// 2. Normalization Helpers
function normalizeName(n) {
    return String(n).toLowerCase()
        .replace(/\./g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

const byFullName = new Map(base.map(s => [normalizeName(s.name), s]));
const byLastNameState = new Map(
    base.map(s => {
        const parts = s.name.split(' ');
        const last = normalizeName(parts[parts.length - 1]);
        return [`${last}|${s.state}`, s];
    })
);

// 3. Scraping Helpers
async function fetchPage(url) {
    const res = await fetch(url, { 
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' } 
    });
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
    return await res.text();
}

function extractVoteCounts($, row) {
    const tds = $(row).find('td');
    if (tds.length < 3) return null;

    const senatorCell = $(tds[0]).text().trim();
    
    /**
     * FIX: Escaped the literal brackets \[ and \]
     * Matches format: "Name [R-ST]" or "Last, First [D-ST]"
     */
    const match = senatorCell.match(/^(.+?)\s+\[([DRI])-([A-Z]{2})\]/);
    if (!match) return null;

    const rawName = match[1].trim();
    const state = match[3];

    // FIX: Remove commas before parsing integers
    const cleanNum = (str) => parseInt(str.replace(/,/g, ''), 10) || 0;
    
    const totalVotes = cleanNum($(tds[1]).text().trim());
    const missedVotes = cleanNum($(tds[2]).text().trim());

    return { rawName, state, totalVotes, missedVotes };
}

function matchSenator(rawName, state) {
    let candidateName = rawName;
    
    // Handle "Last, First" format
    if (rawName.includes(',')) {
        const parts = rawName.split(',').map(p => p.trim());
        const last = parts[0];
        const first = parts[1].replace(/\s+[A-Z]\.?$/, ''); // Remove middle initials
        candidateName = `${first} ${last}`;
    }
    
    const normFull = normalizeName(candidateName);

    // Exact Match
    if (byFullName.has(normFull)) return byFullName.get(normFull);

    // Match by Last Name + State
    const last = normalizeName(candidateName.split(' ').pop());
    const key = `${last}|${state}`;
    if (byLastNameState.has(key)) return byLastNameState.get(key);

    // Fuzzy Match (Partial)
    for (const [k, sen] of byFullName.entries()) {
        if (sen.state === state && (k.includes(normFull) || normFull.includes(k))) {
            return sen;
        }
    }
    return null;
}

async function main() {
    /**
     * NOTE: 'congress.gov/members' is a list, not a voting table.
     * You likely want a URL like: https://www.govtrack.us/congress/members/report-cards/2025/senate/missed-votes
     */
    const URL = 'https://www.congress.gov/members'; 
    console.log(`Fetching vote data from ${URL}...`);
    
    const html = await fetchPage(URL);
    const $ = cheerio.load(html);

    // Adjust selector based on the actual table structure of your source
    const rows = $('table tbody tr');
    let matched = 0, unmatched = 0;

    rows.each((i, row) => {
        const data = extractVoteCounts($, row);
        if (!data) return;

        const sen = matchSenator(data.rawName, data.state);
        if (!sen) {
            console.warn(`Could not match: ${data.rawName} (${data.state})`);
            unmatched++; 
            return; 
        }

        sen.totalVotes = data.totalVotes;
        sen.missedVotes = data.missedVotes;
        // Calculate percentage for convenience
        sen.missedPercentage = sen.totalVotes > 0 
            ? ((sen.missedVotes / sen.totalVotes) * 100).toFixed(2) 
            : "0.00";
        
        matched++;
    });

    fs.writeFileSync(OUTPUT, JSON.stringify(base, null, 2));
    console.log(`---`);
    console.log(`Success! File updated.`);
    console.log(`Matched: ${matched} | Unmatched: ${unmatched}`);
}

main().catch(err => {
    console.error('Critical Error:', err.message);
    process.exit(1);
});
