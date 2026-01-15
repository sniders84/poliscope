const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const xml2js = require('xml2js').parseStringPromise;

const RANKINGS_PATH = path.join(__dirname, '../public/senators-rankings.json');

const SESSION_RANGES = {
  1: { start: 1, end: 658 },
  2: { start: 1, end: 100 }
};

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

async function parseVoteCounts(parsed, senatorMap, voteId) {
  const members = parsed?.roll_call_vote?.members?.member || [];
  const yea = [];
  const nay = [];
  const notVoting = [];
  const unmatched = [];
  const matchedLog = [];

  members.forEach(m => {
    const voteCast = m.vote_cast?.trim() || 'Unknown';
    let xmlFull = (m.member_full || '').trim().toLowerCase();
    const state = (m.state || '').trim().toUpperCase();
    const party = (m.party || '').trim().toUpperCase();

    // Clean XML name
    xmlFull = xmlFull.replace(/\s*\([d,r,i]-\w{2}\)\s*/i, '').trim();

    let matched = false;

    for (const senInfo of senatorMap.values()) {
      const senNameLower = senInfo.name.toLowerCase();
      const senState = senInfo.state?.toUpperCase() || '';
      const senParty = senInfo.party?.toUpperCase() || '';

      // Get senator last name parts (handles compound like "blunt rochester")
      const senLastParts = senNameLower.split(' ').slice(-2); // last 1 or 2 words
      const lastMatch = senLastParts.some(part => xmlFull.includes(part));

      if (lastMatch &&
          (!senState || senState === state) &&
          (!senParty || senParty === party)) {
        if (voteCast === 'Yea') yea.push(senInfo.name);
        if (voteCast === 'Nay') nay.push(senInfo.name);
        if (voteCast === 'Not Voting') notVoting.push(senInfo.name);
        matched = true;
        matchedLog.push(`${senInfo.name} matched to "${m.member_full}" (${voteCast})`);
        break;
      }
    }

    if (!matched && voteCast !== 'Unknown') {
      unmatched.push(`${m.member_full} (${state}-${party}, ${voteCast})`);
    }
  });

  console.log(`Vote ${voteId}: ${yea.length} Yea, ${nay.length} Nay, ${notVoting.length} Not Voting`);

  if (matchedLog.length > 0) {
    console.log(`Matches in ${voteId}: ${matchedLog.slice(0, 3).join(', ')}...`);
  }

  if (unmatched.length > 0) {
    console.log(`Unmatched in ${voteId}: ${unmatched.slice(0, 5).join(', ')}...`);
  }

  return { yea, nay, notVoting };
}

async function main() {
  console.log('Votes scraper: last-name + state/party match + match logging');

  let rankings;
  try {
    rankings = JSON.parse(fs.readFileSync(RANKINGS_PATH, 'utf8'));
  } catch (err) {
    console.error('Failed to load rankings.json:', err.message);
    return;
  }

  const senatorMap = new Map();
  rankings.forEach(sen => {
    senatorMap.set(sen.bioguideId, {
      name: sen.name,
      state: sen.state || '',
      party: sen.party || ''
    });
  });

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

  let totalProcessed = 0;

  const promises = [];
  for (const [session, range] of Object.entries(SESSION_RANGES)) {
    for (let num = range.start; num <= range.end; num++) {
      const padded = num.toString().padStart(5, '0');
      const url = `https://www.senate.gov/legislative/LIS/roll_call_votes/vote119${session}/vote_119_${session}_${padded}.xml`;
      promises.push(
        fetchVote(url).then(parsed => {
          if (!parsed) return;
          totalProcessed++;
          const voteId = `vote_119_${session}_${padded}`;
          parseVoteCounts(parsed, senatorMap, voteId).then(counts => {
            counts.yea.forEach(name => voteCounts.yea[name]++);
            counts.nay.forEach(name => voteCounts.nay[name]++);
            counts.notVoting.forEach(name => voteCounts.notVoting[name]++);
          });
        })
      );
    }
  }

  await Promise.all(promises);

  rankings.forEach(sen => {
    const yea = voteCounts.yea[sen.name] || 0;
    const nay = voteCounts.nay[sen.name] || 0;
    const missed = voteCounts.notVoting[sen.name] || 0;
    sen.yeaVotes = yea;
    sen.nayVotes = nay;
    sen.missedVotes = missed;
    sen.totalVotes = totalProcessed;
    sen.missedVotePct = sen.totalVotes > 0 ? +((missed / sen.totalVotes) * 100).toFixed(2) : 0;
    sen.participationPct = sen.totalVotes > 0 ? +(((yea + nay) / sen.totalVotes) * 100).toFixed(2) : 0;
  });

  try {
    fs.writeFileSync(RANKINGS_PATH, JSON.stringify(rankings, null, 2));
    console.log(`Votes updated: ${totalProcessed} roll calls processed`);
  } catch (err) {
    console.error('Write error:', err.message);
  }
}

main().catch(err => console.error('Votes failed:', err.message));
