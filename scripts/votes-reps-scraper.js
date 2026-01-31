// scripts/votes-reps-scraper.js
// Purpose: Scrape House roll call votes for the 119th Congress (2025 + 2026)
// Fetches roll call XML from clerk.house.gov/Votes/YYYYNNN.xml
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const { XMLParser } = require('fast-xml-parser');

const OUT_PATH = path.join(__dirname, '..', 'public', 'representatives-rankings.json');
const DEBUG_LOG = path.join(__dirname, '..', 'public', 'votes-debug-log.txt');

const SESSIONS = [2025, 2026];
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '', trimValues: true });

function log(msg) {
  console.log(msg);
  fs.appendFileSync(DEBUG_LOG, `${new Date().toISOString()} - ${msg}\n`);
}

function ensureSchema(rep) {
  rep.yeaVotes ??= 0;
  rep.nayVotes ??= 0;
  rep.missedVotes ??= 0;
  rep.totalVotes ??= 0;
  rep.participationPct ??= 0;
  rep.missedVotePct ??= 0;
  // ... other defaults you had
  return rep;
}

async function fetchRoll(year, roll) {
  const url = `https://clerk.house.gov/Votes/${year}${roll}`;
  log(`Fetching: ${url}`);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PoliscopeBot/1.0)' } });
    log(`Status: ${res.status} ${res.statusText}`);
    if (!res.ok) return null;
    const text = await res.text();
    if (!text.includes('<rollcall>')) {
      log(`Warning: Response does not look like roll call XML`);
      return null;
    }
    return text;
  } catch (err) {
    log(`Fetch error: ${err.message}`);
    return null;
  }
}

function parseVotes(xml) {
  let doc;
  try {
    doc = parser.parse(xml);
  } catch (err) {
    log(`XML parse error: ${err.message}`);
    return [];
  }

  const voteRecords = doc?.rollcall?.vote?.['recorded-vote'] || doc?.rollcall?.['recorded-vote'] || [];
  const arr = Array.isArray(voteRecords) ? voteRecords : [voteRecords];

  return arr.map(v => {
    const leg = v?.legislator || {};
    return {
      bioguideId: leg.bioguideID || leg.bioguideId || '',
      vote: (leg.vote || '').trim().toLowerCase()
    };
  }).filter(v => v.bioguideId);
}

(async function main() {
  // Clear debug log
  fs.writeFileSync(DEBUG_LOG, '');

  let reps;
  try {
    reps = JSON.parse(fs.readFileSync(OUT_PATH, 'utf-8')).map(ensureSchema);
  } catch (err) {
    log(`Error reading ${OUT_PATH}: ${err.message}`);
    return;
  }

  const repMap = new Map(reps.map(r => [r.bioguideId?.toLowerCase(), r]));
  log(`Loaded ${reps.length} representatives with Bioguide IDs`);

  let attached = 0;
  let totalVotesProcessed = 0;

  for (const year of SESSIONS) {
    log(`Scanning House roll calls for ${year}...`);
    let consecutiveFails = 0;
    let roll = 1;

    while (true) {
      const xml = await fetchRoll(year, roll);
      if (!xml) {
        consecutiveFails++;
        if (consecutiveFails > 50) {
          log(`Stopping ${year} scan after 50 consecutive failures`);
          break;
        }
        roll++;
        continue;
      }

      consecutiveFails = 0;
      const votes = parseVotes(xml);
      log(`Roll ${roll}: ${votes.length} vote records parsed`);

      if (votes.length === 0) {
        roll++;
        continue;
      }

      totalVotesProcessed++;
      for (const v of votes) {
        const idLower = v.bioguideId.toLowerCase();
        if (!repMap.has(idLower)) continue;

        const rep = repMap.get(idLower);
        const voteLower = v.vote.toLowerCase();

        if (voteLower === 'yea' || voteLower === 'yes') rep.yeaVotes++;
        else if (voteLower === 'nay' || voteLower === 'no') rep.nayVotes++;
        else rep.missedVotes++;

        rep.totalVotes++;
        attached++;
      }

      roll++;
      // Safety cap — House rarely exceeds ~2000 rolls per session
      if (roll > 3000) break;
    }
  }

  // Final stats & percentages
  for (const r of reps) {
    if (r.totalVotes > 0) {
      const participated = r.yeaVotes + r.nayVotes;
      r.participationPct = Number(((participated / r.totalVotes) * 100).toFixed(2));
      r.missedVotePct = Number(((r.missedVotes / r.totalVotes) * 100).toFixed(2));
    }
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(reps, null, 2));
  log(`House votes updated: ${attached} member-votes attached across ${totalVotesProcessed} roll calls`);
  console.log(`House votes updated: ${attached} member-votes attached across ${totalVotesProcessed} roll calls`);
})();
