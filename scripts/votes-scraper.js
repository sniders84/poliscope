const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const xml2js = require('xml2js').parseStringPromise;

const RANKINGS_PATH = path.join(__dirname, '../public/senators-rankings.json');

// Define ranges (adjust 'end' as needed)
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

async function parseVoteCounts(parsed, senatorMap) {
  const members = parsed?.vote?.members?.member || [];
  const yea = [];
  const nay = [];
  const notVoting = [];
  const unmatched = [];

  members.forEach(m => {
    const lisId = m.lis_member_id || '';
    const voteCast = m.vote_cast?.trim() || 'Unknown';
    const fullName = (m.member_full || '').trim().toLowerCase();
    const state = (m.state || '').trim().toUpperCase();
    const party = (m.party || '').trim().toUpperCase();

    let matched = false;

    // Try LIS ID first
    if (lisId && senatorMap.has(lisId)) {
      const senName = senatorMap.get(lisId);
      if (voteCast === 'Yea') yea.push(senName);
      if (voteCast === 'Nay') nay.push(senName);
      if (voteCast === 'Not Voting') notVoting.push(senName);
      matched = true;
    } else {
      // Fallback: match name + state + party
      const xmlName = fullName.replace(/\s*\([r,d,i]-\w{2}\)\s*/i, '').trim(); // Remove (R-TX)
      for (const [senName, senInfo] of senatorMap) {
        const senLower = senName.toLowerCase();
        const senState = senInfo.state?.toUpperCase() || '';
        const senParty = senInfo.party?.toUpperCase() || '';
        if (xmlName.includes(senLower.split(' ').pop()) && // Last name match
            (!senState || senState === state) && 
            (!senParty || senParty === party)) {
          if (voteCast === 'Yea') yea.push(senName);
          if (voteCast === 'Nay') nay.push(senName);
          if (voteCast === 'Not Voting') notVoting.push(senName);
          matched = true;
          break;
        }
      }
    }

    if (!matched && voteCast !== 'Unknown') {
      unmatched.push(`${fullName} (${state}-${party}, ${voteCast})`);
    }
  });

  return { yea, nay, notVoting, unmatched };
}

async function main() {
  console.log('Votes scraper: sequential + name/state/party fallback');

  let rankings;
  try {
    rankings = JSON.parse(fs.readFileSync(RANKINGS_PATH, 'utf8'));
  } catch (err) {
    console.error('Failed to load rankings.json:', err.message);
    return;
  }

  // Map: bioguideId → {name, state, party}
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
          parseVoteCounts(parsed, senatorMap).then(counts => {
            counts.yea.forEach(name => voteCounts.yea[name]++);
            counts.nay.forEach(name => voteCounts.nay[name]++);
            counts.notVoting.forEach(name => voteCounts.notVoting[name]++);
            if (counts.unmatched.length > 0) {
              console.log(`Unmatched in vote_119_${session}_${padded}: ${counts.unmatched.slice(0, 5).join(', ')}...`);
            }
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
