// scripts/votes-reps-scraper.js
// Purpose: Scrape House roll call votes for the 119th Congress (2025 + 2026)
// Parses Clerk XML feeds, flood-controlled logging

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const { XMLParser } = require('fast-xml-parser');

const OUT_PATH = path.join(__dirname, '..', 'public', 'representatives-rankings.json');
const ROSTER_PATH = path.join(__dirname, '..', 'public', 'legislators-current.json');

const SESSIONS = [2025, 2026];
const roster = JSON.parse(fs.readFileSync(ROSTER_PATH, 'utf-8'));

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  trimValues: true,
});

function ensureVoteShape(r) {
  r.yeaVotes ??= 0;
  r.nayVotes ??= 0;
  r.missedVotes ??= 0;
  r.totalVotes ??= 0;
  r.participationPct ??= 0;
  r.missedVotePct ??= 0;
  return r;
}

function findBioguide({ first, last, state }) {
  const match = roster.find(r => {
    const t = r.terms[r.terms.length - 1];
    return (
      t?.type === 'rep' &&
      r.name?.last?.toLowerCase() === (last || '').toLowerCase() &&
      r.name?.first?.toLowerCase() === (first || '').toLowerCase() &&
      t?.state === state
    );
  });
  return match?.id?.bioguide;
}

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

(async function main() {
  const reps = JSON.parse(fs.readFileSync(OUT_PATH, 'utf-8')).map(ensureVoteShape);
  const repMap = new Map(reps.map(r => [r.bioguideId, r]));

  let attached = 0;

  for (const year of SESSIONS) {
    console.log(`Scanning House roll calls for ${year}...`);
    let consecutiveFails = 0;

    for (let roll = 1; roll <= 1200; roll++) {
      const xml = await fetchRoll(year, roll);
      if (!xml) {
        consecutiveFails++;
        if (consecutiveFails > 200) break;
        continue;
      }
      consecutiveFails = 0;

      let doc;
      try { doc = parser.parse(xml); } catch { continue; }

      const members = doc?.rollcall?.members?.member || [];
      const arr = Array.isArray(members) ? members : [members];

      for (const m of arr) {
        const first = m.firstname || '';
        const last = m.lastname || '';
        const state = m.state || '';
        const voteCast = (m.vote || '').toLowerCase();
        if (!voteCast) continue;

        const bioguide = findBioguide({ first, last, state });
        if (!bioguide || !repMap.has(bioguide)) continue;

        const rep = repMap.get(bioguide);
        rep.totalVotes++;
        if (voteCast === 'yea' || voteCast === 'yes') rep.yeaVotes++;
        else if (voteCast === 'nay' || voteCast === 'no') rep.nayVotes++;
        else rep.missedVotes++;
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

  fs.writeFileSync(OUT_PATH, JSON.stringify(re
