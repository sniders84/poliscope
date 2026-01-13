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

function lastNameOf(fullName) {
  const parts = fullName.split(' ');
  return parts[parts.length - 1];
}

async function scrapeNotVoting(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) return [];
  const html = await res.text();
  const $ = cheerio.load(html);

  // Find the "Not Voting" block robustly
  const header = $('h3').filter((i, el) => $(el).text().trim().toLowerCase().includes('not voting')).first();
  if (!header.length) return [];

  // The names are typically in the next table or sibling block
  let blockText = '';
  const next = header.next();
  if (next && next.text()) blockText = next.text();
  else blockText = header.parent().text();

  const tokens = blockText.split(/[\n,;]+/).map(t => t.trim()).filter(Boolean);
  const notVoting = [];

  tokens.forEach(tok => {
    const m = tok.match(/([A-Za-z.\- ]+)\s*\([DRI]-([A-Z]{2})\)/);
    if (!m) return;
    const namePart = m[1].replace(/^Sen\.?\s*/i, '').trim();
    const state = m[2];

    // Try to match by last name + state
    for (const sen of base) {
      if (sen.state === state && lastNameOf(sen.name).replace(/\./g, '') === namePart.split(' ').pop().replace(/\./g, '')) {
        notVoting.push(sen.name);
        break;
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
  urls.sort((a, b) => a.localeCompare(b)); // stable order

  console.log(`Total roll calls discovered: ${urls.length}`);

  for (const url of urls) {
    const notV = await scrapeNotVoting(url);
    notV.forEach(n => missed[n] = (missed[n] || 0) + 1);
    await delay(1000); // polite delay
  }

  base.forEach(s => {
    s.totalVotes = urls.length;
    s.missedVotes = missed[s.name] || 0;
    s.votedVotes = s.totalVotes - s.missedVotes;
  });

  fs.writeFileSync(OUTPUT, JSON.stringify(base, null, 2));
  console.log('senators-rankings.json updated with votes (total/missed/voted).');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
