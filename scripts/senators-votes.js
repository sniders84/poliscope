// scripts/senators-votes.js
const fs = require('fs');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

const OUTPUT = 'public/senators-rankings.json';
const base = JSON.parse(fs.readFileSync(OUTPUT, 'utf8'));

const INDEX_URLS = [
  'https://www.senate.gov/legislative/LIS/roll_call_lists/vote_menu_119_1.xml',
  'https://www.senate.gov/legislative/LIS/roll_call_lists/vote_menu_119_2.xml'
];

async function fetchXml(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return await res.text();
}

async function getVoteUrls(indexUrl, sessionPrefix, sessionNum) {
  const xml = await fetchXml(indexUrl);
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

  const header = $('h3').filter((i, el) => $(el).text().toLowerCase().includes('not voting')).first();
  if (!header.length) return [];

  const blockText = header.next().text() || header.parent().text();
  const tokens = blockText.split(/[\n,;]+/).map(t => t.trim()).filter(Boolean);

  const notVoting = [];
  tokens.forEach(tok => {
    const m = tok.match(/([A-Za-z.\- ]+)\s*\([DRI]-([A-Z]{2})\)/);
    if (m) {
      const state = m[2];
      const last = m[1].split(' ').pop();
      const sen = base.find(s => s.state === state && s.name.includes(last));
      if (sen) notVoting.push(sen.name);
    }
  });
  return notVoting;
}

async function main() {
  const missed = {};
  base.forEach(s => missed[s.name] = 0);

  let urls = [];
  urls = urls.concat(await getVoteUrls(INDEX_URLS[0], 'vote1191', '1'));
  urls = urls.concat(await getVoteUrls(INDEX_URLS[1], 'vote1192', '2'));

  for (const url of urls) {
    const notV = await scrapeNotVoting(url);
    notV.forEach(n => missed[n]++);
    await new Promise(r => setTimeout(r, 500));
  }

  base.forEach(s => {
    s.totalVotes = urls.length;
    s.missedVotes = missed[s.name] || 0;
    s.votedVotes = s.totalVotes - s.missedVotes;
  });

  fs.writeFileSync(OUTPUT, JSON.stringify(base, null, 2));
  console.log('senators-rankings.json updated with votes.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
