// scripts/votes-senators-scraper.js
// Purpose: Scrape Senate roll call votes for the 119th Congress (2025 + 2026)
// Robust XML parsing with fast-xml-parser, HTML entity decoding, and flood-controlled logging

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const { XMLParser } = require('fast-xml-parser');

const OUT_PATH = path.join(__dirname, '..', 'public', 'senators-rankings.json');
const ROSTER_PATH = path.join(__dirname, '..', 'public', 'legislators-current.json');

const SESSIONS = [2025, 2026];
const roster = JSON.parse(fs.readFileSync(ROSTER_PATH, 'utf-8'));

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  allowBooleanAttributes: true,
  trimValues: true,
  parseTagValue: true,
  parseAttributeValue: true,
  htmlEntities: true, // decode &nbsp; &ndash; etc.
});

function ensureVoteShape(sen) {
  sen.yeaVotes = sen.yeaVotes || 0;
  sen.nayVotes = sen.nayVotes || 0;
  sen.missedVotes = sen.missedVotes || 0;
  sen.totalVotes = sen.totalVotes || 0;
  sen.participationPct = sen.participationPct || 0;
  sen.missedVotePct = sen.missedVotePct || 0;
  return sen;
}

function findBioguideFlexible({ lisId, last, state }) {
  // Prefer LIS ID mapping via roster terms (Senate)
  if (lisId) {
    const match = roster.find(r =>
      r.terms.some(t => t.type === 'sen' && t.lis === lisId)
    );
    if (match?.id?.bioguide) return match.id.bioguide;
  }
  // Fallback: last name + state + current senator
  const match = roster.find(r => {
    const t = r.terms[r.terms.length - 1];
    return (
      t?.type === 'sen' &&
      r.name?.last?.toLowerCase() === (last || '').toLowerCase() &&
      t?.state === state
    );
  });
  return match?.id?.bioguide;
}

async function fetchRoll(year, roll) {
  const rollStr = String(roll).padStart(5, '0'); // Senate roll call numbers are 5 digits
  const url = `https://www.senate.gov/legislative/LIS/roll_call_votes/vote${year}${rollStr}.xml`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const xml = await res.text();
    return { url, xml };
  } catch {
    return null;
  }
}

(async function main() {
  const sens = JSON.parse(fs.readFileSync(OUT_PATH, 'utf-8')).map(ensureVoteShape);
  const senMap = new Map(sens.map(r => [r.bioguideId, r]));

  let attached = 0;

  for (const year of SESSIONS) {
    console.log(`Scanning Senate roll calls for ${year}...`);
    let consecutiveFails = 0;
    let processed = 0;

    for (let roll = 1; roll <= 1200; roll++) {
      const result = await fetchRoll(year, roll);
      if (!result) {
        consecutiveFails++;
        if (consecutiveFails > 200) {
          console.log(`Stopping at roll ${roll} for ${year} (too many misses)`);
          break;
        }
        continue;
      }
      consecutiveFails = 0;
      processed++;

      let doc;
      try {
        doc = parser.parse(result.xml);
      } catch {
        // Bad XML—skip silently
        continue;
      }

      const members =
        doc.roll_call_vote?.members?.member ||
        doc.roll_call_vote?.members ||
        [];

      const arr = Array.isArray(members) ? members : [members];

      for (const m of arr) {
        const lisId = m.lis_member_id || m.member_id || null;
        const last = m.last_name || '';
        const state = m.state || '';
        const voteCast = (m.vote_cast || '').toLowerCase();

        if (!voteCast) continue;

        const bioguide = findBioguideFlexible({ lisId, last, state });
        if (!bioguide || !senMap.has(bioguide)) continue;

        const sen = senMap.get(bioguide);
        sen.totalVotes++;

        if (voteCast === 'yea' || voteCast === 'yes') sen.yeaVotes++;
        else if (voteCast === 'nay' || voteCast === 'no') sen.nayVotes++;
        else sen.missedVotes++;

        attached++;
      }

      // Light progress logging every 100 rolls
      if (processed % 100 === 0) {
        console.log(`Processed ${processed} rolls for ${year}...`);
      }
    }
  }

  // Compute percentages
  for (const s of sens) {
    if (s.totalVotes > 0) {
      const participated = s.yeaVotes + s.nayVotes;
      s.participationPct = Number(((participated / s.totalVotes) * 100).toFixed(2));
      s.missedVotePct = Number(((s.missedVotes / s.totalVotes) * 100).toFixed(2));
    } else {
      s.participationPct = 0;
      s.missedVotePct = 0;
    }
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(sens, null, 2));
  console.log(`Senate votes updated: ${attached} member-votes attached`);
})();
