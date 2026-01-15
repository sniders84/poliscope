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
  console.log(`Total vote XML URLs across sessions: ${urls.length}`);
  return urls;
}

async function parseVoteCounts(url, senatorMap) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) return { yea: [], nay: [], notVoting: [] };

  const xml = await res.text();
  const parsed = await xml2js(xml, { trim: true, explicitArray: false });
  const members = parsed.vote?.members?.member || [];

  const yea = [];
  const nay = [];
  const notVoting = [];
  const unmatched = [];

  members.forEach(m => {
    let xmlLast = m.last_name?.trim().toLowerCase() || '';
    // Normalize XML last_name: remove commas, parentheses, party/state
    xmlLast = xmlLast.replace(/[,()]/g, '').replace(/\s+\w-\w\w$/, '').trim(); // Remove (R-AL) etc.
    const voteCast = m.vote_cast?.trim();

    let matched = false;
    for (const [senName, senLast] of senatorMap) {
      if (xmlLast.includes(senLast) || senLast.includes(xmlLast)) {
        if (voteCast === 'Yea') yea.push(senName);
        if (voteCast === 'Nay') nay.push(senName);
        if (voteCast === 'Not Voting' || voteCast === 'Absent') notVoting.push(senName);
        matched = true;
        break;
      }
    }

    if (!matched) {
      unmatched.push(`${m.last_name} (${voteCast})`);
    }
  });

  // Log for debug
  console.log(`Vote ${url.split('/').pop()}: ${yea.length} Yea, ${nay.length} Nay, ${notVoting.length} Not Voting`);
  if (unmatched.length > 0) {
    console.log(`Unmatched on ${url.split('/').pop()}: ${unmatched.slice(0, 5).join(', ')}...`);
  }

  return { yea, nay, notVoting };
}

async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log('Votes scraper: parsing Yea, Nay, Not Voting/Absent from all 119th sessions');

  let rankings;
  try {
    rankings = JSON.parse(fs.readFileSync(RANKINGS_PATH, 'utf8'));
  } catch (err) {
    console.error('Failed to load rankings.json:', err.message);
    return;
  }

  // Map: senName → normalized last name (slice(1).join(' ') for compound)
  const senatorMap = new Map();
  rankings.forEach(sen => {
    const parts = sen.name.split(' ');
    const lastName = parts.slice(1).join(' ').toLowerCase(); // Handle "Blunt Rochester" as last
    senatorMap.set(sen.name, lastName);
  });

  const urls = await getVoteDetailUrls();
  if (urls.length === 0) return console.log('No votes found');

  const voteCounts = {
    yea: {},
    nay: {},
    notVoting: {}
  };
  rankings.forEach(s => {
    voteCounts.yea[s.name] = 0;
    voteCounts.nay[s.name] = 0;
    voteCounts.notVoting[s.name] = 0;
  });

  for (const url of urls) {
    const counts = await parseVoteCounts(url, senatorMap);
    counts.yea.forEach(name => voteCounts.yea[name]++);
    counts.nay.forEach(name => voteCounts.nay[name]++);
    counts.notVoting.forEach(name => voteCounts.notVoting[name]++);
    await delay(2000);
  }

  rankings.forEach(sen => {
    const yea = voteCounts.yea[sen.name] || 0;
    const nay = voteCounts.nay[sen.name] || 0;
    const missed = voteCounts.notVoting[sen.name] || 0;
    sen.yeaVotes = yea;
    sen.nayVotes = nay;
    sen.missedVotes = missed;
    sen.totalVotes = urls.length;
    sen.missedVotePct = sen.totalVotes > 0 ? +((missed / sen.totalVotes) * 100).toFixed(2) : 0;
    sen.participationPct = sen.totalVotes > 0 ? +(((yea + nay) / sen.totalVotes) * 100).toFixed(2) : 0;
  });

  try {
    fs.writeFileSync(RANKINGS_PATH, JSON.stringify(rankings, null, 2));
    console.log(`Votes updated: ${urls.length} roll calls processed`);
  } catch (err) {
    console.error('Failed to write rankings.json:', err.message);
  }
}

main().catch(err => console.error('Votes scraper failed:', err.message));
