// scripts/votes-reps-scraper.js
// Purpose: Scrape House roll call votes for the 119th Congress (sessions 2025 + 2026)
// Directly fetches rollNNN.xml files from clerk.house.gov
// Tallies yea/nay/not voting for each representative using last-name matching with state disambiguation

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const { XMLParser } = require('fast-xml-parser');

const OUT_PATH = path.join(__dirname, '..', 'public', 'representatives-rankings.json');
const ROSTER_PATH = path.join(__dirname, '..', 'public', 'legislators-current.json');

// Sessions to cover (expandable for future years)
const SESSIONS = [2025, 2026];

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  trimValues: true,
});

// Load roster and build minimal matching index
const roster = JSON.parse(fs.readFileSync(ROSTER_PATH, 'utf-8'))
  .filter(r => r.terms.at(-1).type === 'rep');

const lastNameIndex = new Map();
// Index: lastNameLower -> [{ bioguideId, state, district }]
for (const r of roster) {
  const t = r.terms.at(-1);
  const key = r.name.last.toLowerCase();
  const entry = { bioguideId: r.id.bioguide, state: t.state, district: String(t.district || 'At-Large') };
  if (!lastNameIndex.has(key)) lastNameIndex.set(key, []);
  lastNameIndex.get(key).push(entry);
}

function ensureVoteShape(rep) {
  rep.yeaVotes = rep.yeaVotes || 0;
  rep.nayVotes = rep.nayVotes || 0;
  rep.missedVotes = rep.missedVotes || 0;
  rep.totalVotes = rep.totalVotes || 0;
  rep.participationPct = rep.participationPct || 0;
  rep.missedVotePct = rep.missedVotePct || 0;
  return rep;
}

async function fetchRoll(year, roll) {
  const rollStr = String(roll).padStart(3, '0');
  const url = `https://clerk.house.gov/evs/${year}/roll${rollStr}.xml`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) return null;
    const xml = await res.text();
    return { url, xml };
  } catch {
    return null;
  }
}

// Normalize entries like "Smith (TX)" or "Smith"
function normalizeEntry(node) {
  const text = (typeof node === 'string' ? node : node?._text || '').trim();
  if (!text) return { last: null, state: null };
  const m = text.match(/^(.+?)\s*\(([A-Z]{2})\)\s*$/);
  if (m) return { last: m[1].trim(), state: m[2] };
  return { last: text, state: null };
}

function matchBioguide(last, state) {
  if (!last) return null;
  const candidates = lastNameIndex.get(last.toLowerCase());
  if (!candidates || candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0].bioguideId;
  if (state) {
    const byState = candidates.find(c => c.state === state);
    if (byState) return byState.bioguideId;
  }
  return null; // ambiguous
}

function extractList(doc, tag) {
  const section = doc?.rollcall?.[tag]?.[tag.slice(0, -1)];
  if (!section) return [];
  return Array.isArray(section) ? section : [section];
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
      const result = await fetchRoll(year, roll);
      if (!result) {
        if (++consecutiveFails > 20) {
          console.log(`Stopping at roll ${roll} for ${year} (too many misses)`);
          break;
        }
        continue;
      }
      consecutiveFails = 0;

      let doc;
      try {
        doc = parser.parse(result.xml);
      } catch {
        continue;
      }

      const yeas = extractList(doc, 'yeas');
      const nays = extractList(doc, 'nays');
      const notVoting = extractList(doc, 'not-voting');

      if (yeas.length === 0 && nays.length === 0 && notVoting.length === 0) continue;
      totalVotesProcessed++;

      const seen = new Set();

      for (const entry of yeas) {
        const { last, state } = normalizeEntry(entry);
        const bioguide = matchBioguide(last, state);
        if (!bioguide || seen.has(bioguide) || !repMap.has(bioguide)) continue;
        seen.add(bioguide);
        const rep = repMap.get(bioguide);
        rep.yeaVotes++;
        rep.totalVotes++;
        attached++;
      }

      for (const entry of nays) {
        const { last, state } = normalizeEntry(entry);
        const bioguide = matchBioguide(last, state);
        if (!bioguide || seen.has(bioguide) || !repMap.has(bioguide)) continue;
        seen.add(bioguide);
        const rep = repMap.get(bioguide);
        rep.nayVotes++;
        rep.totalVotes++;
        attached++;
      }

      for (const entry of notVoting) {
        const { last, state } = normalizeEntry(entry);
        const bioguide = matchBioguide(last, state);
        if (!bioguide || seen.has(bioguide) || !repMap.has(bioguide)) continue;
        seen.add(bioguide);
        const rep = repMap.get(bioguide);
        rep.missedVotes++;
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
