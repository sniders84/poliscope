const fs = require('fs');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

const base = JSON.parse(fs.readFileSync('public/senators-rankings.json', 'utf8'));

const senatorStateMap = new Map(base.map(s => [s.name.split(' ').pop(), s.state])); // Last name -> state for matching

const INDEX_URL = 'https://www.senate.gov/legislative/LIS/roll_call_lists/vote_menu_119_1.xml';

async function getVoteUrls() {
  const res = await fetch(INDEX_URL, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) return [];
  const xml = await res.text();
  const matches = xml.match(/<vote_number>(\d+)<\/vote_number>/g) || [];
  const urls = matches.map(m => {
    const num = m.match(/\d+/)[0].padStart(5, '0');
    return `https://www.senate.gov/legislative/LIS/roll_call_votes/vote1191/vote_119_1_${num}.htm`;
  });
  urls.sort((a, b) => b.localeCompare(a)); // newest first
  return urls;
}

async function scrapeNotVoting(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) return [];
  const html = await res.text();
  const $ = cheerio.load(html);
  const notVoting = [];
  const text = $('*:contains("Not Voting")').nextAll().addBack().text();
  text.split(/[\n,;]/).forEach(line => {
    const cleaned = line.trim().replace(/Sen\.?\s*/gi, '');
    const match = cleaned.match(/(\w+)\s*\([RD]-([A-Z]{2})\)/);
    if (match) {
      const lastName = match[1];
      const state = match[2];
      // Find matching senator by last name and state
      for (const sen of base) {
        if (sen.name.split(' ').pop() === lastName && sen.state === state) {
          notVoting.push(sen.name);
          break;
        }
      }
    }
  });
  return notVoting;
}

async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const missed = {};
  base.forEach(s => missed[s.name] = 0);

  const urls = await getVoteUrls();
  console.log(`Total votes: ${urls.length}`);

  for (const url of urls) {
    const notV = await scrapeNotVoting(url);
    notV.forEach(n => missed[n] = (missed[n] || 0) + 1);
    await delay(2000); // 2s delay to avoid blocks
  }

  base.forEach(s => {
    s.missedVotes = missed[s.name] || 0;
    s.totalVotes = urls.length;
  });

  fs.writeFileSync('public/senators-rankings.json', JSON.stringify(base, null, 2));
  console.log('senators-rankings.json updated with votes!');
}

main();
