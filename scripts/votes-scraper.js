// scripts/votes-scraper.js
// Purpose: Scrape Senate roll call votes for the 119th Congress (sessions 2025 + 2026)
// Uses LIS XML feeds and a LIS→bioguide map to avoid mismatches
// Uses xml2js for parsing (no fast-xml-parser)

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const xml2js = require('xml2js');

const RANKINGS_PATH = path.join(__dirname, '../public/senators-rankings.json');
const ROSTER_PATH = path.join(__dirname, '../public/legislators-current.json');

const SESSION_RANGES = {
  1: { start: 1, end: 659 },
  2: { start: 1, end: 9 } // adjust end as session progresses
};

const parser = new xml2js.Parser({
  explicitArray: false,
  mergeAttrs: true,
  attrValueProcessors: [xml2js.processors.parseNumbers, xml2js.processors.parseBooleans],
  tagNameProcessors: [xml2js.processors.stripPrefix],
  attrNameProcessors: [xml2js.processors.stripPrefix]
});

// Load roster
const roster = JSON.parse(fs.readFileSync(ROSTER_PATH, 'utf-8'));
const senators = roster.filter(r => r.terms?.at(-1)?.type === 'sen');

function ensureSchema(sen) {
  // Votes
  sen.yeaVotes ??= 0;
  sen.nayVotes ??= 0;
  sen.missedVotes ??= 0;
  sen.totalVotes ??= 0;
  sen.participationPct ??= 0;
  sen.missedVotePct ??= 0;

  // Legislation
  sen.sponsoredBills ??= 0;
  sen.cosponsoredBills ??= 0;
  sen.sponsoredAmendments ??= 0;
  sen.cosponsoredAmendments ??= 0;
  sen.becameLawBills ??= 0;

  // Committees
  sen.committees ??= [];

  // Scores
  sen.rawScore ??= 0;
  sen.score ??= 0;
  sen.scoreNormalized ??= 0;

  return sen;
}

// Build LIS→bioguide map by sampling one roll call XML
async function buildLisMap() {
  const url = 'https://www.senate.gov/legislative/LIS/roll_call_votes/vote1191/vote_119_1_00001.xml';
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch map sample: ${res.status}`);
  const xml = await res.text();
  const doc = await parser.parseStringPromise(xml);
  const members = doc.roll_call_vote?.members?.member || [];
  const map = new Map();

  for (const m of members) {
    const last = m.last_name?.toLowerCase();
    const state = m.state;
    const lis = m.lis_member_id;
    const match = senators.find(s => {
      const t = s.terms?.at(-1);
      return s.name?.last?.toLowerCase() === last && t?.state === state;
    });
    if (match) map.set(lis, match.id.bioguide);
  }
  return map;
}

async function fetchVote(url) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) return null;
    const xml = await res.text();
    return await parser.parseStringPromise(xml);
  } catch {
    return null;
  }
}

async function main() {
  console.log('Votes scraper: LIS ID mapping for senators');
  let rankings;
  try {
    rankings = JSON.parse(fs.readFileSync(RANKINGS_PATH, 'utf8')).map(ensureSchema);
  } catch (err) {
    console.error('Failed to load senators-rankings.json:', err.message);
    return;
  }

  const repMap = new Map(rankings.map(r => [r.bioguideId, r]));
  const voteCounts = {};
  rankings.forEach(s => {
    voteCounts[s.bioguideId] = { yea: 0, nay: 0, missed: 0 };
  });

  const lisMap = await buildLisMap();

  let totalProcessed = 0;
  for (const [session, range] of Object.entries(SESSION_RANGES)) {
    for (let num = range.start; num <= range.end; num++) {
      const padded = num.toString().padStart(5, '0');
      const url = `https://www.senate.gov/legislative/LIS/roll_call_votes/vote119${session}/vote_119_${session}_${padded}.xml`;
      const parsed = await fetchVote(url);
      if (!parsed) continue;

      totalProcessed++;
      const members = parsed.roll_call_vote?.members?.member || [];
      for (const m of members) {
        const lis = m.lis_member_id;
        const voteCast = (m.vote_cast || '').trim();
        const bioguide = lisMap.get(lis);
        if (!bioguide || !repMap.has(bioguide)) continue;

        const counts = voteCounts[bioguide];
        if (voteCast === 'Yea') counts.yea++;
        else if (voteCast === 'Nay') counts.nay++;
        else if (voteCast === 'Not Voting') counts.missed++;
      }
    }
  }

  rankings.forEach(sen => {
    const counts = voteCounts[sen.bioguideId] || { yea: 0, nay: 0, missed: 0 };
    sen.yeaVotes = counts.yea;
    sen.nayVotes = counts.nay;
    sen.missedVotes = counts.missed;
    sen.totalVotes = counts.yea + counts.nay + counts.missed;
    sen.participationPct = sen.totalVotes > 0 ? +(((counts.yea + counts.nay) / sen.totalVotes) * 100).toFixed(2) : 0;
    sen.missedVotePct = sen.totalVotes > 0 ? +((counts.missed / sen.totalVotes) * 100).toFixed(2) : 0;
  });

  try {
    fs.writeFileSync(RANKINGS_PATH, JSON.stringify(rankings, null, 2));
    console.log(`Senate votes updated: ${totalProcessed} roll calls processed`);
  } catch (err) {
    console.error('Write error:', err.message);
  }
}

main().catch(err => console.error('Votes failed:', err.message));
