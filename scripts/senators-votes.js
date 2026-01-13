// scripts/senators-votes.js
const fs = require('fs');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

const OUTPUT = 'public/senators-rankings.json';

// 1. Load base data
if (!fs.existsSync(OUTPUT)) {
    console.error(`Error: ${OUTPUT} not found. Run your main scraper first to generate the base JSON.`);
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
    // GovTrack Missed Votes table typically has 4 columns: Rank, Senator, Percentage, Count
    if (tds.length < 4) return null;

    const senatorCell = $(tds[1]).text().trim(); // Senator is in column 2
    const countCell = $(tds[3]).text().trim();   // Count (e.g., "95 / 659") is in column 4

    // Matches Name [P-ST] format
    const nameMatch = senatorCell.match(/^([^\[]+)\s+\[([DRI])-([A-Z]{2})\]/);
    if (!nameMatch) return null;

    const rawName = nameMatch[1].trim();
    const state = nameMatch[3];

    // Parse "Missed / Total" counts
    // We split by "/" and strip commas/whitespace
    const parts = countCell.split('/').map(n => parseInt(n.replace(/,/g, '').trim(), 10));
    const missedVotes = parts[0] || 0;
    const totalVotes = parts[1] || 0;

    return { rawName, state, totalVotes, missedVotes };
}

function matchSenator(rawName, state) {
    let candidateName = rawName;
    
    // Handle "Last, First" format if applicable
    if (rawName.includes(',')) {
        const parts = rawName.split(',').map(p => p.trim());
        candidateName = `${parts[1].replace(/\s+[A-Z]\.?$/, '')} ${parts[0]}`;
    }
    
    const normFull = normalizeName(candidateName);
    if (byFullName.has(normFull)) return byFullName.get(normFull);

    const last = normalizeName(candidateName.split(' ').pop());
    const key = `${last}|${state}`;
    if (byLastNameState.has(key)) return byLastNameState.get(key);

    // Partial fallback for suffixes (Jr, III, etc)
    for (const [k, sen] of byFullName.entries()) {
        if (sen.state === state && (k.includes(last) || last.includes(k))) {
            return sen;
        }
    }
    return null;
}

async function main() {
    // We target the 2025 Report Card for the 119th Congress, 1st Session
    const URL = 'https://www.govtrack.us/congress/members/report-cards/2025/senate/missed-votes'; 
    console.log(`Fetching 2025 vote data from ${URL}...`);
    
    const html = await fetchPage(URL);
    const $ = cheerio.load(html);

    // GovTrack uses standard 'table' classes for data
    const rows = $('table.table tbody tr');
    let matched = 0, unmatched = 0;

    rows.each((i, row) => {
        const data = extractVoteCounts($, row);
        if (!data) return;

        const sen = matchSenator(data.rawName, data.state);
        if (!sen) {
            console.warn(`[SKIP] Could not match: ${data.rawName} (${data.state})`);
            unmatched++; 
            return; 
        }

        // Update the reference in our 'base' array
        sen.totalVotes = data.totalVotes;
        sen.missedVotes = data.missedVotes;
        sen.missedPercentage = data.totalVotes > 0 
            ? ((data.missedVotes / data.totalVotes) * 100).toFixed(2) 
            : "0.00";
        
        matched++;
    });

    fs.writeFileSync(OUTPUT, JSON.stringify(base, null, 2));
    
    console.log(`\n--- VOTE SCRAPE COMPLETE ---`);
    console.log(`Updated: ${OUTPUT}`);
    console.log(`Matched: ${matched}`);
    console.log(`Unmatched: ${unmatched}`);
}

main().catch(err => {
    console.error('CRITICAL ERROR:', err.message);
    process.exit(1);
});
