// scripts/votes-reps-scraper.js
// Purpose: Scrape House roll call votes and update representatives-rankings.json

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const { JSDOM } = require('jsdom');

const rankingsPath = path.join(__dirname, '../public/representatives-rankings.json');

console.log('Starting votes-reps-scraper.js');

let reps;
try {
  reps = JSON.parse(fs.readFileSync(rankingsPath, 'utf-8'));
  console.log(`Loaded ${reps.length} representatives`);
} catch (err) {
  console.error('Failed to read representatives-rankings.json:', err.message);
  process.exit(1);
}

const repMap = new Map(reps.map(r => [r.bioguideId.toUpperCase(), r]));

async function scrapeRollCall(roll) {
  const url = `https://clerk.house.gov/Votes/${roll}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`Failed to fetch roll call ${roll}: ${res.status}`);
    return;
  }
  const html = await res.text();
  const dom = new JSDOM(html);
  const rows = dom.window.document.querySelectorAll('table tr');

  for (const row of rows) {
    const cells = row.querySelectorAll('td');
    if (cells.length < 3) continue;

    const bioguide = (cells[0].textContent || '').trim().toUpperCase();
    const vote = (cells[2].textContent || '').trim().toLowerCase();

    if (!bioguide || !repMap.has(bioguide)) continue;
    const rep = repMap.get(bioguide);

    rep.totalVotes = (rep.totalVotes || 0) + 1;
    if (vote.includes('yea')) rep.yeaVotes = (rep.yeaVotes || 0) + 1;
    else if (vote.includes('nay')) rep.nayVotes = (rep.nayVotes || 0) + 1;
    else rep.missedVotes = (rep.missedVotes || 0) + 1;
  }
}

(async function main() {
  // Example: scrape first 25 roll calls of 119th Congress
  for (let i = 1; i <= 25; i++) {
    await scrapeRollCall(i.toString().padStart(3, '0'));
  }

  // Compute participation percentages
  for (const rep of repMap.values()) {
    const total = rep.totalVotes || 0;
    const missed = rep.missedVotes || 0;
    rep.participationPct = total > 0 ? Number(((total - missed) / total * 100).toFixed(2)) : 100;
    rep.missedVotePct = total > 0 ? Number((missed / total * 100).toFixed(2)) : 0;
  }

  fs.writeFileSync(rankingsPath, JSON.stringify(Array.from(repMap.values()), null, 2));
  console.log(`House votes updated in ${rankingsPath}`);
})();
