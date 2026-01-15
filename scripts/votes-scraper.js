const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const xml2js = require('xml2js').parseStringPromise;

const RANKINGS_PATH = path.join(__dirname, '../public/senators-rankings.json');

// Define ranges (update these as needed; can be expanded later)
const SESSION_RANGES = {
  1: { start: 1, end: 658 },  // Adjust end to latest known
  2: { start: 1, end: 100 }   // Session 2 may have fewer; increase as needed
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
    let xmlLast = (m.last_name || '').trim().toLowerCase();
    const voteCast = m.vote_cast?.trim();

    let matched = false;
    for (const [senName, senInfo] of senatorMap) {
      const senLast = senInfo.lastName.toLowerCase();
      if (xmlLast === senLast || xmlLast.includes(senLast) || senLast.includes(xmlLast)) {
        if (voteCast === 'Yea') yea.push(senName);
        if (voteCast === 'Nay') nay.push(senName);
        if (voteCast === 'Not Voting') notVoting.push(senName);
        matched = true;
        break;
      }
    }

    if (!matched && voteCast) {
      unmatched.push(`${m.last_name || 'Unknown'} (${voteCast})`);
    }
  });

  return { yea, nay, notVoting, unmatched };
}

async function main() {
  console.log('Votes scraper: generating sequential URLs for 119th Senate roll calls');

  let rankings;
  try {
    rankings = JSON.parse(fs.readFileSync(RANKINGS_PATH, 'utf8'));
  } catch (err) {
    console.error('Failed to load rankings.json:', err.message);
    return;
  }

  const senatorMap = new Map();
  rankings.forEach(sen => {
    const parts = sen.name.split(' ');
    const lastName = parts.slice(1).join(' ') || parts[0]; // Handle compound last names
    senatorMap.set(sen.name, { lastName });
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

  // Generate and fetch votes in parallel for speed
  const promises = [];
  for (const [session, range] of Object.entries(SESSION_RANGES)) {
    for (let num = range.start; num <= range.end; num++) {
      const padded = num.toString().padStart(5, '0');
      const url = `https://www.senate.gov/legislative/LIS/roll_call_votes/vote119${session}/vote_119_${session}_${padded}.xml`;
      promises.push(
        fetchVote(url).then(parsed => {
          if (!parsed) return; // 404 or error
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
    console.log('Fields: yeaVotes, nayVotes, missedVotes, participationPct');
  } catch (err) {
    console.error('Failed to write rankings.json:', err.message);
  }
}

main().catch(err => console.error('Votes scraper failed:', err.message));
