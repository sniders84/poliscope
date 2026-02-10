// scripts/votes-reps-scraper.js
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const { XMLParser } = require('fast-xml-parser');

const OUT_PATH = path.join(__dirname, '..', 'public', 'representatives-rankings.json');
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '', trimValues: true });
const SESSIONS = [2025, 2026];

async function fetchRoll(year, roll) {
  const rollStr = String(roll).padStart(3, '0');
  const url = `https://clerk.house.gov/evs/${year}/roll${rollStr}.xml`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function parseVotes(xml) {
  let doc;
  try {
    doc = parser.parse(xml);
  } catch {
    return [];
  }
  let voteRecords = doc?.['rollcall-vote']?.['recorded-vote'] || [];
  if (!Array.isArray(voteRecords)) voteRecords = [voteRecords];

  return voteRecords.map(v => {
    const leg = v.legislator || {};
    const id = leg['name-id'] || leg.bioguideID || leg.bioguideId || '';
    return {
      bioguideId: id.trim().toUpperCase(),
      vote: (v.vote || '').trim().toLowerCase()
    };
  }).filter(v => v.bioguideId);
}

(async function main() {
  let reps;
  try {
    reps = JSON.parse(fs.readFileSync(OUT_PATH, 'utf-8'));
  } catch {
    console.error(`ERROR reading ${OUT_PATH}`);
    return;
  }

  const repMap = new Map(reps.map(r => [r.bioguideId.toUpperCase(), r]));

  for (const year of SESSIONS) {
    for (let roll = 1; roll <= 500; roll++) {
      const xml = await fetchRoll(year, roll);
      if (!xml) continue;
      const votes = parseVotes(xml);
      for (const v of votes) {
        if (!repMap.has(v.bioguideId)) continue;
        const rep = repMap.get(v.bioguideId);
        if (v.vote === 'yea' || v.vote === 'yes') rep.yeaVotes = (rep.yeaVotes || 0) + 1;
        else if (v.vote === 'nay' || v.vote === 'no') rep.nayVotes = (rep.nayVotes || 0) + 1;
        else rep.missedVotes = (rep.missedVotes || 0) + 1;
        rep.totalVotes = (rep.totalVotes || 0) + 1;
      }
    }
  }

  for (const rep of repMap.values()) {
    if (rep.totalVotes > 0) {
      const participated = (rep.yeaVotes || 0) + (rep.nayVotes || 0);
      rep.participationPct = Number(((participated / rep.totalVotes) * 100).toFixed(2));
      rep.missedVotePct = Number(((rep.missedVotes / rep.totalVotes) * 100).toFixed(2));
    }
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(Array.from(repMap.values()), null, 2));
  console.log(`House votes updated in ${OUT_PATH}`);
})();
