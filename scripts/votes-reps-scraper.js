// scripts/votes-reps-scraper.js
// Scrape House roll call votes from congress.gov aggregate index (both sessions of 119th)
// Uniform with Senate - counts yea/nay/missed per representative

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const fetch = require('node-fetch');

const RANKINGS_PATH = path.join(__dirname, '../public/representatives-rankings.json');
const INDEX_URLS = [
  'https://www.congress.gov/votes/house/119th-congress/1st-session',
  'https://www.congress.gov/votes/house/119th-congress/2nd-session'
];

let reps = [];
try {
  reps = JSON.parse(fs.readFileSync(RANKINGS_PATH, 'utf8'));
} catch (err) {
  console.error('Failed to load representatives-rankings.json:', err.message);
  process.exit(1);
}

const repMap = new Map(reps.map(r => [r.bioguideId, r]));

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrapeHouseVotes() {
  let allVoteUrls = [];

  // Collect roll call vote detail links from both session index pages
  for (const indexUrl of INDEX_URLS) {
    console.log(`Fetching votes index: ${indexUrl}`);
    try {
      const res = await fetch(indexUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      if (!res.ok) {
        console.error(`Index fetch failed: ${res.status} for ${indexUrl}`);
        continue;
      }

      const html = await res.text();
      const $ = cheerio.load(html);

      $('table tr').each((i, row) => {
        if (i === 0) return; // skip header
        const link = $(row).find('td a').first().attr('href');
        if (link && link.includes('/roll-call-vote/')) {
          allVoteUrls.push('https://www.congress.gov' + link);
        }
      });
    } catch (err) {
      console.error(`Error fetching index ${indexUrl}: ${err.message}`);
    }
  }

  console.log(`Found ${allVoteUrls.length} House roll call vote detail pages`);

  const totalVotes = allVoteUrls.length;
  const voteCounts = {};
  reps.forEach(r => {
    voteCounts[r.bioguideId] = { yea: 0, nay: 0, missed: 0 };
  });

  // Process each roll call vote detail page
  for (const url of allVoteUrls) {
    console.log(`Processing vote: ${url}`);
    try {
      const voteRes = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DataBot/1.0)' }
      });
      if (!voteRes.ok) {
        console.error(`Vote fetch failed: ${voteRes.status} for ${url}`);
        continue;
      }

      const voteHtml = await voteRes.text();
      const $$ = cheerio.load(voteHtml);

      // Adjust selector if needed; usually .vote-table or #members-vote
      $$('table tr').each((i, row) => {
        if (i === 0) return;
        const cells = $$(row).find('td');
        if (cells.length < 3) return;

        const name = cells.eq(0).text().trim();
        const partyState = cells.eq(1).text().trim(); // e.g. "R-AL"
        const vote = cells.eq(2).text().trim().toLowerCase();

        // Match representative by name + party/state
        const rep = reps.find(r => {
          const matchName = r.name.toLowerCase().includes(name.toLowerCase());
          const matchPartyState =
            partyState.includes(r.party.charAt(0)) && partyState.includes(r.state);
          return matchName || matchPartyState;
        });

        if (!rep) return;

        const counts = voteCounts[rep.bioguideId];
        if (vote === 'yea' || vote === 'yes') counts.yea++;
        else if (vote === 'nay' || vote === 'no') counts.nay++;
        else counts.missed++;
      });

      await delay(3000); // polite delay per vote page
    } catch (err) {
      console.error(`Error on vote ${url}: ${err.message}`);
    }
  }

  // Update reps with tallies
  reps.forEach(rep => {
    const counts = voteCounts[rep.bioguideId] || { yea: 0, nay: 0, missed: 0 };
    rep.yeaVotes = counts.yea;
    rep.nayVotes = counts.nay;
    rep.missedVotes = counts.missed;
    rep.totalVotes = totalVotes;
    rep.participationPct =
      totalVotes > 0 ? ((counts.yea + counts.nay) / totalVotes * 100).toFixed(2) : '0.00';
    rep.missedVotePct =
      totalVotes > 0 ? (counts.missed / totalVotes * 100).toFixed(2) : '0.00';
  });

  fs.writeFileSync(RANKINGS_PATH, JSON.stringify(reps, null, 2));
  console.log(`House votes updated: ${totalVotes} roll calls processed across both sessions`);
}

scrapeHouseVotes().catch(err => console.error('House votes scraper failed:', err.message));
