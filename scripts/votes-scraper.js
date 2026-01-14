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
    console.error(`Index fetch failed: ${res.status}`);
    return [];
  }
  const xml = await res.text();

  // Parse XML to get vote numbers
  const voteNumbers = xml.match(/<vote_number>(\d+)<\/vote_number>/g) || [];
  const urls = voteNumbers.map(match => {
    const num = match.match(/\d+/)[0].padStart(5, '0');
    return `https://www.senate.gov/legislative/LIS/roll_call_votes/vote1191/vote_119_1_${num}.htm`;
  });
  urls.sort((a, b) => b.localeCompare(a)); // newest first
  console.log(`Found ${urls.length} vote detail URLs`);
  return urls;
}

async function scrapeNotVoting(url, nameToStateMap) {
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
  // Find "Not Voting" section
  const nvSection = $('*:contains("Not Voting:")');
  if (nvSection.length === 0) return notVoting;

  const text = nvSection.nextAll().addBack().text();
  text.split(/[\n,;]/).forEach(line => {
    const cleaned = line.trim().replace(/Sen\.?\s*/gi, '');
    const match = cleaned.match(/([A-Za-z\s]+)\s*\(([RD])-[A-Z]{2}\)/);
    if (match) {
      const fullName = match[1].trim();
      const state = cleaned.match(/[A-Z]{2}/)?.[0] || '';
      // Match by last name + state
      for (const [name, senState] of nameToStateMap) {
        if (name.split(' ').pop() === fullName.split(' ').pop() && senState === state) {
          notVoting.push(name);
          break;
        }
      }
    }
  });

  return notVoting;
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  let rankings;
  try {
    rankings = JSON.parse(fs.readFileSync(RANKINGS_PATH, 'utf8'));
  } catch (err) {
    console.error('Failed to load rankings.json:', err.message);
    return;
  }

  // Map name -> state for matching "Not Voting" entries
  const nameToStateMap = new Map(rankings.map(s => [s.name, s.state || '']));

  const urls = await getVoteDetailUrls();
  console.log(`Processing ${urls.length} votes...`);

  const missed = {};
  rankings.forEach(s => missed[s.name] = 0);

  for (const url of urls) {
    const notV = await scrapeNotVoting(url, nameToStateMap);
    notV.forEach(name => missed[name] = (missed[name] || 0) + 1);
    console.log(`Processed ${url.split('/').pop()}: ${notV.length} missed votes`);
    await delay(3000); // 3s delay to avoid 403s
  }

  // Update rankings in place
  rankings.forEach(sen => {
    sen.missedVotes = missed[sen.name] || 0;
    sen.totalVotes = urls.length;
  });

  try {
    fs.writeFileSync(RANKINGS_PATH, JSON.stringify(rankings, null, 2));
    console.log(`Updated senators-rankings.json with votes: ${urls.length} total votes processed`);
  } catch (err) {
    console.error('Failed to write rankings.json:', err.message);
  }
}

main().catch(err => {
  console.error('Votes scraper failed:', err.message);
  process.exit(1);
});
