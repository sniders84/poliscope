const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const xml2js = require('xml2js').parseStringPromise;

const RANKINGS_PATH = path.join(__dirname, '../public/representatives-rankings.json');

// Adjust session ranges for House roll calls in the 119th Congress.
// Update these ranges as more votes occur.
const SESSION_RANGES = {
  1: { start: 1, end: 659 },
  2: { start: 1, end: 9 }
};

// Build LIS ID → name map dynamically from a sample roll call XML
async function buildLisMap() {
  const url = `https://clerk.house.gov/evs/2026/roll028.xml`; // any roll call with all members
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch LIS map: ${res.status}`);
  const xml = await res.text();
  const parsed = await xml2js(xml, { explicitArray: false });
  const members = parsed.roll_call_vote.members.member;
  const map = {};
  members.forEach(m => {
    const id = m.lis_member_id;
    const name = (m.member_full || '').replace(/\s*\([^)]+\)\s*/, '').trim();
    if (id && name) map[id] = name;
  });
  return map;
}

async function fetchVote(url) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) return null;
    const xml = await res.text();
    return await xml2js(xml, { trim: true, explicitArray: false });
  } catch {
    return null;
  }
}

async function parseVoteCounts(parsed, repMap, lisMap, voteId) {
  const members = parsed?.roll_call_vote?.members?.member || [];
  const yea = [];
  const nay = [];
  const notVoting = [];
  const seenInVote = new Set();

  members.forEach(m => {
    const voteCast = m.vote_cast?.trim() || 'Unknown';
    const lisId = m.lis_member_id?.trim();
    let name = null;

    if (lisId && lisMap[lisId]) {
      name = lisMap[lisId];
    } else {
      let xmlFull = (m.member_full || '').trim().toLowerCase();
      xmlFull = xmlFull.replace(/\s*\([d,r,i]-\w{2}\)\s*/i, '').trim();

      for (const repInfo of repMap.values()) {
        const repNameLower = repInfo.name.toLowerCase();
        const repLastParts = repNameLower.split(' ').slice(-2);
        const lastMatch = repLastParts.some(part => xmlFull.includes(part));
        if (lastMatch) {
          name = repInfo.name;
          break;
        }
      }
    }

    if (name && !seenInVote.has(name)) {
      seenInVote.add(name);
      if (voteCast === 'Yea') yea.push(name);
      if (voteCast === 'Nay') nay.push(name);
      if (voteCast === 'Not Voting') notVoting.push(name);
    }
  });

  console.log(`Vote ${voteId}: ${yea.length} Yea, ${nay.length} Nay, ${notVoting.length} Not Voting`);
  return { yea, nay, notVoting };
}

async function main() {
  console.log('House votes scraper: auto-build LIS map + parse votes');

  let rankings;
  try {
    rankings = JSON.parse(fs.readFileSync(RANKINGS_PATH, 'utf8'));
  } catch (err) {
    console.error('Failed to load representatives-rankings.json:', err.message);
    return;
  }

  const repMap = new Map();
  rankings.forEach(rep => repMap.set(rep.name, rep));

  const lisMap = await buildLisMap();

  const voteCounts = { yea: {}, nay: {}, notVoting: {} };
  rankings.forEach(r => {
    voteCounts.yea[r.name] = 0;
    voteCounts.nay[r.name] = 0;
    voteCounts.notVoting[r.name] = 0;
  });

  let totalProcessed = 0;
  const promises = [];

  for (const [session, range] of Object.entries(SESSION_RANGES)) {
    for (let num = range.start; num <= range.end; num++) {
      const padded = num.toString().padStart(3, '0');
      const url = `https://clerk.house.gov/evs/2026/roll${padded}.xml`;
      promises.push(
        fetchVote(url).then(parsed => {
          if (!parsed) return;
          totalProcessed++;
          const voteId = `roll_${CONGRESS}_${session}_${padded}`;
          return parseVoteCounts(parsed, repMap, lisMap, voteId).then(counts => {
            counts.yea.forEach(name => voteCounts.yea[name]++);
            counts.nay.forEach(name => voteCounts.nay[name]++);
            counts.notVoting.forEach(name => voteCounts.notVoting[name]++);
          });
        })
      );
    }
  }

  await Promise.all(promises);

  rankings.forEach(rep => {
    const yea = voteCounts.yea[rep.name] || 0;
    const nay = voteCounts.nay[rep.name] || 0;
    const missed = voteCounts.notVoting[rep.name] || 0;
    rep.yeaVotes = yea;
    rep.nayVotes = nay;
    rep.missedVotes = missed;
    rep.totalVotes = totalProcessed;
    rep.missedVotePct = totalProcessed > 0 ? +((missed / totalProcessed) * 100).toFixed(2) : 0;
    rep.participationPct = totalProcessed > 0 ? +(((yea + nay) / totalProcessed) * 100).toFixed(2) : 0;
  });

  try {
    fs.writeFileSync(RANKINGS_PATH, JSON.stringify(rankings, null, 2));
    console.log(`House votes updated: ${totalProcessed} roll calls processed`);
  } catch (err) {
    console.error('Write error:', err.message);
  }
}

main().catch(err => console.error('House votes failed:', err.message));
