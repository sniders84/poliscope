const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const xml2js = require('xml2js').parseStringPromise;

const RANKINGS_PATH = path.join(__dirname, '../public/senators-rankings.json');
const INDEX_URL = 'https://www.senate.gov/legislative/LIS/roll_call_lists/vote_menu_119_1.xml';

async function getVoteDetailUrls() {
  const res = await fetch(INDEX_URL, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) {
    console.error(`Index fetch failed: ${res.status}`);
    return [];
  }
  const xml = await res.text();
  const parsed = await xml2js(xml, { trim: true });
  const voteNumbers = parsed.vote_summary?.votes?.vote?.map(v => v.vote_number) || [];
  const urls = voteNumbers.map(num => {
    const padded = num.toString().padStart(5, '0');
    return `https://www.senate.gov/legislative/LIS/roll_call_votes/vote1191/vote_119_1_${padded}.xml`;
  });
  console.log(`Found ${urls.length} vote detail XML URLs`);
  return urls;
}

async function parseNotVoting(url, nameToStateMap) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) {
    console.warn(`Skipped ${url.split('/').pop()}: ${res.status}`);
    return [];
  }

  const xml = await res.text();
  const parsed = await xml2js(xml, { trim: true });
  const members = parsed.vote?.members?.member || [];

  const notVoting = [];
  members.forEach(m => {
    if (m.vote_cast === 'Not Voting') {
      const lastName = m.last_name;
      const state = m.state;
      for (const [senName, senState] of nameToStateMap) {
        if (senName.split(' ').pop() === lastName && senState === state) {
          notVoting.push(senName);
          break;
        }
      }
    }
  });

  if (notVoting.length > 0) {
    console.log(`Not Voting on ${url.split('/').pop()}: ${notVoting.join(', ')}`);
  }
  return notVoting;
}

async function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log('Votes scraper: parsing "Not Voting" from detail XML files');

  let rankings;
  try {
    rankings = JSON.parse(fs.readFileSync(RANKINGS_PATH, 'utf8'));
  } catch (err) {
    console.error('Failed to load senators-rankings.json:', err.message);
    return;
  }

  const nameToStateMap = new Map(rankings.map(s => [s.name, s.state || '']));

  const urls = await getVoteDetailUrls();
  if (urls.length === 0) {
    console.log('No votes found - skipping');
    return;
  }

  const missed = {};
  rankings.forEach(s => missed[s.name] = 0);

  for (const url of urls) {
    const notV = await parseNotVoting(url, nameToStateMap);
    notV.forEach(name => missed[name]++);
    await delay(2000);
  }

  rankings.forEach(sen => {
    sen.missedVotes = missed[sen.name] || 0;
    sen.totalVotes = urls.length;
  });

  fs.writeFileSync(RANKINGS_PATH, JSON.stringify(rankings, null, 2));
  console.log(`Updated senators-rankings.json with votes (total roll calls: ${urls.length})`);
}

main().catch(err => {
  console.error('Votes scraper failed:', err.message);
  process.exit(1);
});
