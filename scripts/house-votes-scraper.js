// scripts/house-votes-scraper.js
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const xml2js = require('xml2js').parseStringPromise;

const REPS_PATH = path.join(__dirname, '../public/representatives-rankings.json');

const HOUSE_YEARS = [2025, 2026];
const MAX_VOTES_PER_YEAR = 2000; // safety

async function fetchHouseVote(year, rollNum) {
  const padded = rollNum.toString().padStart(3, '0');
  const url = `https://clerk.house.gov/evs/${year}/roll${padded}.xml`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) return null;
    const xml = await res.text();
    return await xml2js(xml, { trim: true, explicitArray: false });
  } catch {
    return null;
  }
}

async function parseHouseVoteCounts(parsed, repMap, voteId) {
  const members = parsed?.rollcallvote?.members?.member || [];
  const yea = [];
  const nay = [];
  const notVoting = [];
  const unmatched = [];
  const seen = new Set();

  members.forEach(m => {
    const voteCast = (m.vote || 'Unknown').trim();
    const bioguideId = m.bioguideID?.trim();
    if (!bioguideId || seen.has(bioguideId)) return;
    seen.add(bioguideId);

    if (repMap.has(bioguideId)) {
      const name = repMap.get(bioguideId).name;
      if (voteCast === 'Yea') yea.push(name);
      else if (voteCast === 'Nay') nay.push(name);
      else if (voteCast === 'Not Voting') notVoting.push(name);
    } else if (voteCast !== 'Unknown') {
      unmatched.push(`${m.name || 'unknown'} (${bioguideId || '?'}, ${voteCast})`);
    }
  });

  console.log(`House Vote ${voteId}: ${yea.length} Yea, ${nay.length} Nay, ${notVoting.length} Not Voting`);

  if (unmatched.length > 0) {
    console.log(`Unmatched in ${voteId}: ${unmatched.slice(0,5).join(', ')}... (total unmatched: ${unmatched.length})`);
  }

  return { yea, nay, notVoting };
}

async function main() {
  console.log('House votes scraper: Bioguide ID matching, 119th Congress');

  let rankings;
  try {
    rankings = JSON.parse(fs.readFileSync(REPS_PATH, 'utf8'));
  } catch (err) {
    console.error('Failed to load representatives-rankings.json:', err.message);
    return;
  }

  const repMap = new Map();
  rankings.forEach(rep => {
    if (rep.bioguideId) repMap.set(rep.bioguideId, rep);
  });

  const voteCounts = { yea: {}, nay: {}, notVoting: {} };
  rankings.forEach(r => {
    voteCounts.yea[r.name] = 0;
    voteCounts.nay[r.name] = 0;
    voteCounts.notVoting[r.name] = 0;
  });

  let totalProcessed = 0;

  for (const year of HOUSE_YEARS) {
    for (let num = 1; num <= MAX_VOTES_PER_YEAR; num++) {
      const parsed = await fetchHouseVote(year, num);
      if (!parsed) {
        console.log(`No more votes found after roll ${num-1} in ${year}`);
        break;
      }
      totalProcessed++;
      const voteId = `${year}-roll${num}`;
      const counts = await parseHouseVoteCounts(parsed, repMap, voteId);
      counts.yea.forEach(n => voteCounts.yea[n]++);
      counts.nay.forEach(n => voteCounts.nay[n]++);
      counts.notVoting.forEach(n => voteCounts.notVoting[n]++);
    }
  }

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
    fs.writeFileSync(REPS_PATH, JSON.stringify(rankings, null, 2));
    console.log(`House votes updated: ${totalProcessed} roll calls processed`);
  } catch (err) {
    console.error('Write error:', err.message);
  }
}

main().catch(err => console.error('House votes failed:', err.message));
