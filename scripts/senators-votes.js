const fs = require('fs');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

const base = JSON.parse(fs.readFileSync('public/senators-rankings.json', 'utf8'));

const INDEX_URLS = [
  'https://www.senate.gov/legislative/LIS/roll_call_lists/vote_menu_119_1.xml',
  'https://www.senate.gov/legislative/LIS/roll_call_lists/vote_menu_119_2.xml'
];

async function getVoteUrls(indexUrl, sessionPrefix, sessionNum) {
  const res = await fetch(indexUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) return [];
  const xml = await res.text();
  const matches = xml.match(/<vote_number>(\d+)<\/vote_number>/g) || [];
  return matches.map(m => {
    const num = m.match(/\d+/)[0].padStart(5, '0');
    return `https://www.senate.gov/legislative/LIS/roll_call_votes/${sessionPrefix}/vote_119_${sessionNum}_${num}.htm`;
  });
}

async function scrapeNotVoting(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) return [];
  const html = await res.text();
  const $ = cheerio.load(html);

  const block = $('h3:contains("Not Voting")').next();
  const names = block.text().split(/\s{2,}|\n+/).map(s => s.trim()).filter(Boolean);

  const notVoting = [];
  names.forEach(n => {
    const match = n.match(/([A-Za-z.\- ]+)\s*\([DRI]-([A-Z]{2})\)/);
    if (match) {
      const cleaned = match[1].trim();
      const state = match[2];
      for (const sen of base) {
        if (sen.state === state && sen.name.includes(cleaned)) {
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

  let urls = [];
  urls = urls.concat(await getVoteUrls(INDEX_URLS[0], 'vote1191', '1'));
  urls = urls.concat(await getVoteUrls(INDEX_URLS[1], 'vote1192', '2'));
  console.log(`Total votes: ${urls.length}`);

  for (const url of urls) {
    const notV = await scrapeNotVoting(url);
    notV.forEach(n => missed[n] = (missed[n] || 0) + 1);
    await delay(2000);
  }

  base.forEach(s => {
    s.missedVotes = missed[s.name] || 0;
    s.totalVotes = urls.length;
  });

  fs.writeFileSync('public/senators-rankings.json', JSON.stringify(base, null, 2));
  console.log('senators-rankings.json updated with votes!');
}

main();
