// scripts/votes-reps-scraper.js
// Purpose: Scrape House roll call votes for the 119th Congress (2025–2026)

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
  return rep;
}

async function fetchRoll(year, roll) {
  const rollStr = String(roll).padStart(3, '0');
  const url = `https://clerk.house.gov/Votes/${year}/roll${rollStr}.xml`;
  log(`Fetching: ${url}`);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (PoliscopeBot/1.0)' } });
    if (!res.ok) return null;
    return await res.text();
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

  let voteRecords = doc?.['rollcall-vote']?.['recorded-vote'] || [];
  if (!Array.isArray(voteRecords)) voteRecords = [voteRecords];

  return voteRecords.map(v => {
    const leg = v.legislator || {};
    const id = leg.bioguideID || leg.bioguideId || leg['@bioGuideID'] || leg['@name-id'] || '';
    return {
      bioguideId: id.trim(),
      vote: (v.vote || '').trim().toLowerCase()
    };
  }).filter(v => v.bioguideId);
}

(async function main() {
  fs.writeFileSync(DEBUG_LOG, '--- Votes Scraper Debug Log ---\n');

  let reps;
  try {
    reps = JSON.parse(fs.readFileSync(OUT_PATH, 'utf-8')).map(ensureSchema);
  } catch (err) {
    log(`ERROR reading ${OUT_PATH}: ${err.message}`);
    return;
  }

  const repMap = new Map(reps.map(r => [r.bioguideId.toLowerCase(), r]));
  log(`Loaded ${reps.length} representatives`);

  let attached = 0;
  let totalVotesProcessed = 0;

  for (const year of SESSIONS) {
    log(`\nScanning House roll calls for ${year}...`);
    let consecutiveFails = 0;

    for (let roll = 1; roll <= 3000; roll++) {
      const xml = await fetchRoll(year, roll);
      if (!xml) {
        consecutiveFails++;
        if (consecutiveFails > 100) {
          log(`Stopping ${year} scan after 100 consecutive misses`);
          break;
        }
        continue;
      }

      consecutiveFails = 0;
      const votes = parseVotes(xml);
      if (votes.length === 0) continue;

      totalVotesProcessed++;
      for (const v of votes) {
        const idLower = v.bioguideId.toLowerCase();
        if (!repMap.has(idLower)) {
          log(`Bioguide mismatch: ${v.bioguideId}`);
          continue;
        }
        const rep = repMap.get(idLower);
        if (v.vote === 'yea' || v.vote === 'yes') rep.yeaVotes++;
        else if (v.vote === 'nay' || v.vote === 'no') rep.nayVotes++;
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
  log(`\nFINAL: ${attached} member-votes attached across ${totalVotesProcessed} roll calls`);
  console.log(`House votes updated: ${attached} member-votes attached across ${totalVotesProcessed} roll calls`);
})();
