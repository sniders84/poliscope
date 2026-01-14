/**
 * Votes Scraper (Senate.gov HTML Roll Calls)
 * - Fetches roll call index and detail pages
 * - Parses "Not Voting" from HTML (exact Senate term)
 * - Matches by last name + state
 * - Updates senators-rankings.json directly with missedVotes/totalVotes
 */
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

const RANKINGS_PATH = path.join(__dirname, '../public/senators-rankings.json');
const INDEX_URL = 'https://www.senate.gov/legislative/LIS/roll_call_lists/vote_menu_119_1.xml';

async function getVoteDetailUrls() {
  const res = await fetch(INDEX_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  });
  if (!res.ok) {
    console.error(`Index fetch failed: ${res.status} - ${res.statusText}`);
    return [];
  }

  const xml = await res.text();
  const voteNumbers = xml.match(/<vote_number>(\d+)<\/vote_number>/g) || [];
  const urls = voteNumbers.map(m => {
    const num = m.match(/\d+/)[0].padStart(5, '0');
    return `https://www.senate.gov/legislative/LIS/roll_call_votes/vote1191/vote_119_1_${num}.htm`;
  });

  urls.sort((a, b) => b.localeCompare(a)); // Newest first
  console.log(`Found ${urls.length} vote detail URLs for 119th Congress`);
  return urls;
}

async function parseNotVoting(url, nameToStateMap) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  });
  if (!res.ok) {
    console.warn(`Skipped vote ${url.split('/').pop()}: ${res.status}`);
    return [];
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  const notVoting = [];
  // Senate pages have "Not Voting:" followed by list of names (D-R-AL) format
  $('*:contains("Not Voting:")').each((i, el) => {
    let textBlock = $(el).nextAll().addBack().text();
    // Clean and split names
    textBlock = textBlock.replace(/\s+/g, ' ').trim();
    const nameMatches = textBlock.matchAll(/([A-Za-z\s\-']+?)\s*\(([RD])-([A-Z]{2})\)/g);
    for (const match of nameMatches) {
      const fullName = match[1].trim();
      const party = match[2];
      const state = match[3];
      // Match against your senators by last name + state
      for (const [senName, senState] of nameToStateMap) {
        const senLast = senName.split(' ').pop();
        if (fullName.includes(senLast) && senState === state) {
          notVoting.push(senName);
          break;
        }
      }
    }
  });

  return notVoting;
}

async function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log('Votes scraper: looking for "Not Voting" in 119th Congress roll calls');

  let rankings;
  try {
    rankings = JSON.parse(fs.readFileSync(RANKINGS_PATH, 'utf8'));
  } catch (err) {
    console.error('Failed to load senators-rankings.json:', err.message);
    return;
  }

  // Map for quick name → state lookup
  const nameToStateMap = new Map(rankings.map(s => [s.name, s.state || '']));

  const urls = await getVoteDetailUrls();
  if (urls.length === 0) {
    console.log('No votes found - skipping update');
    return;
  }

  const missed = {};
  rankings.forEach(s => missed[s.name] = 0);

  for (const url of urls) {
    const notV = await parseNotVoting(url, nameToStateMap);
    notV.forEach(name => {
      missed[name] = (missed[name] || 0) + 1;
    });
    console.log(`Processed ${url.split('/').pop()}: ${notV.length} "Not Voting" entries`);
    await delay(2500); // Avoid rate limiting
  }

  // Update rankings in place
  let updatedCount = 0;
  rankings.forEach(sen => {
    const prevMissed = sen.missedVotes || 0;
    sen.missedVotes = missed[sen.name] || 0;
    sen.totalVotes = urls.length;
    if (sen.missedVotes !== prevMissed) updatedCount++;
  });

  try {
    fs.writeFileSync(RANKINGS_PATH, JSON.stringify(rankings, null, 2));
    console.log(`Updated senators-rankings.json with votes for ${updatedCount} senators (total roll calls: ${urls.length})`);
  } catch (err) {
    console.error('Failed to write rankings.json:', err.message);
  }
}

main().catch(err => {
  console.error('Votes scraper crashed:', err.message);
  process.exit(1);
});
