const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const xml2js = require('xml2js').parseStringPromise;

const RANKINGS_PATH = path.join(__dirname, '../public/senators-rankings.json');

async function getVoteDetailUrls() {
  const urls = [];
  for (const session of ['1', '2']) {
    const indexUrl = `https://www.senate.gov/legislative/LIS/roll_call_lists/vote_menu_119_${session}.xml`;
    const res = await fetch(indexUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) {
      console.log(`Session ${session} not available: ${res.status}`);
      continue;
    }
    const xml = await res.text();
    const parsed = await xml2js(xml, { trim: true, explicitArray: false });
    const voteList = parsed.vote_summary?.votes?.vote || [];
    voteList.forEach(v => {
      if (v.vote_number) {
        const num = v.vote_number.toString().padStart(5, '0');
        urls.push(`https://www.senate.gov/legislative/LIS/roll_call_votes/vote119${session}/vote_119_${session}_${num}.xml`);
      }
    });
  }
  console.log(`Total vote XML URLs: ${urls.length}`);
  return urls;
}

async function parseNotVoting(url, nameToLastNameMap) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) return [];
  const xml = await res.text();
  const parsed = await xml2js(xml, { trim: true, explicitArray: false });
  const members = parsed.vote?.members?.member || [];

  const notVoting = [];
  members.forEach(m => {
    if (m.vote_cast === 'Not Voting') {
      const lastName = m.last_name?.trim();
      const state = m.state?.trim();
      const party = m.party?.trim();
      console.log(`Raw Not Voting: ${lastName} (${party}-${state}) from ${url.split('/').pop()}`);
      // Looser match: last name only (most reliable)
      for (const [senName, senLast] of nameToLastNameMap) {
        if (senLast === lastName) {
          notVoting.push(senName);
          console.log(`Matched: ${senName} on ${url.split('/').pop()}`);
          break;
        }
      }
    }
  });
  return notVoting;
}

async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log('Votes scraper: parsing "Not Voting" from all 119th sessions');

  let rankings = JSON.parse(fs.readFileSync(RANKINGS_PATH, 'utf8'));
  const nameToLastNameMap = new Map(rankings.map(s => [s.name, s.name.split(' ').pop()]));

  const urls = await getVoteDetailUrls();
  if (urls.length === 0) return console.log('No votes found');

  const missed = {};
  rankings.forEach(s => missed[s.name] = 0);

  for (const url of urls) {
    const notV = await parseNotVoting(url, nameToLastNameMap);
    notV.forEach(name => missed[name]++);
    await delay(2000);
  }

  rankings.forEach(sen => {
    sen.missedVotes = missed[sen.name] || 0;
    sen.totalVotes = urls.length;
    sen.missedVotePct = sen.totalVotes > 0 ? +((sen.missedVotes / sen.totalVotes) * 100).toFixed(2) : 0;
  });

  fs.writeFileSync(RANKINGS_PATH, JSON.stringify(rankings, null, 2));
  console.log(`Votes updated: ${urls.length} roll calls processed`);
}

main().catch(err => console.error('Votes failed:', err.message));
