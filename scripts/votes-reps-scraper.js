// scripts/votes-reps-scraper.js
// Purpose: Scrape House roll call votes for the 119th Congress (sessions 2025 + 2026)
// Fetches rollNNN.xml files from clerk.house.gov
// Tallies yea/nay/not voting for each representative using roster cross-reference

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const { XMLParser } = require('fast-xml-parser');

const OUT_PATH = path.join(__dirname, '..', 'public', 'representatives-rankings.json');
const SESSIONS = [2025, 2026];

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '', trimValues: true });

function ensureVoteShape(rep) {
  rep.yeaVotes ??= 0;
  rep.nayVotes ??= 0;
  rep.missedVotes ??= 0;
  rep.totalVotes ??= 0;
  rep.participationPct ??= 0;
  rep.missedVotePct ??= 0;
  return rep;
}

async function fetchRoll(year, roll) {
  const rollStr = String(roll).padStart(3, '0');
  const url = `https://clerk.house.gov/evs/${year}/roll${rollStr}.xml`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function parseVotes(xml) {
  let doc;
  try { doc = parser.parse(xml); } catch { return []; }

  // House roll call XML can use "vote-record.vote" or "recorded-vote"
  const records = doc?.rollcall?.['vote-record']?.vote 
               || doc?.rollcall?.['recorded-vote'] 
               || [];
  const arr = Array.isArray(records) ? records : [records];

  return arr.map(rv => ({
    bioguideId: rv?.legislator?.bioguideID || rv?.legislator?.bioguideId || '',
    name: rv?.legislator?.name || '',
    state: rv?.legislator?.state || '',
    district: rv?.legislator?.district || '',
    party: rv?.legislator?.party || '',
    vote: rv?.vote?.trim() || ''
  }));
}

(async function main() {
  const reps = JSON.parse(fs.readFileSync(OUT_PATH, 'utf-8')).map(ensureVoteShape);
  const repMap = new Map(reps.map(r => [r.bioguideId, r]));

  let attached = 0;
  let totalVotesProcessed = 0;

  for (const year of SESSIONS) {
    console.log(`Scanning House roll calls for ${year}...`);
    let consecutiveFails = 0;

    for (let roll = 1; roll <= 1000; roll++) {
      const xml = await fetchRoll(year, roll);
      if (!xml) {
        if (++consecutiveFails > 20) break;
        continue;
      }
      consecutiveFails = 0;

      const votes = parseVotes(xml);
      if (votes.length === 0) continue;
      totalVotesProcessed++;

      for (const v of votes) {
        if (!v.bioguideId || !repMap.has(v.bioguideId)) continue;
        const rep = repMap.get(v.bioguideId);
        if (v.vote.toLowerCase() === 'yea' || v.vote.toLowerCase() === 'yes') rep.yeaVotes++;
        else if (v.vote.toLowerCase() === 'nay' || v.vote.toLowerCase() === 'no') rep.nayVotes++;
        else rep.missedVotes++;
        rep.totalVotes++;
        attached++;
      }
    }
  }

  for (const r of reps) {
    if (r.totalVotes > 0) {
      const participated = r.yeaVotes + r.nayVotes;
      r.participationPct = Number(((participated / r.totalVotes) * 100).toFixed(2));
      r.missedVotePct = Number(((r.missedVotes / r.totalVotes) * 100).toFixed(2));
    }
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(reps, null, 2));
  console.log(`House votes updated: ${attached} member-votes attached across ${totalVotesProcessed} roll calls`);
})();
