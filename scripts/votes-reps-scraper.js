// scripts/votes-reps-scraper.js
// Purpose: Scrape House roll call votes for the 119th Congress (sessions 2025 + 2026)
// Directly fetches rollNNN.xml files from clerk.house.gov
// Updates representatives-rankings.json with yea/nay/missed tallies

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const { DOMParser } = require('@xmldom/xmldom');

const OUT_PATH = path.join(__dirname, '..', 'public', 'representatives-rankings.json');
const ROSTER_PATH = path.join(__dirname, '..', 'public', 'legislators-current.json');

// Sessions to cover (expandable for future years)
const SESSIONS = [2025, 2026];

// Load roster for matching
const roster = JSON.parse(fs.readFileSync(ROSTER_PATH, 'utf-8'));

function findBioguide(first, last, state, district) {
  const match = roster.find(m =>
    m.name.last.toLowerCase() === last.toLowerCase() &&
    m.name.first.toLowerCase().startsWith(first.toLowerCase()) &&
    m.terms.some(t => t.state === state && String(t.district) === String(district))
  );
  return match?.id.bioguide;
}

function ensureRepShape(rep) {
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
    const res = await fetch(url);
    if (!res.ok) return null;
    const xml = await res.text();
    return { url, xml };
  } catch {
    return null;
  }
}

(async function main() {
  const reps = JSON.parse(fs.readFileSync(OUT_PATH, 'utf-8')).map(ensureRepShape);
  const repMap = new Map(reps.map(r => [r.bioguideId, r]));

  let attached = 0;

  for (const year of SESSIONS) {
    console.log(`Scanning roll calls for ${year}...`);
    let consecutiveFails = 0;

    for (let roll = 1; roll <= 1000; roll++) {
      const result = await fetchRoll(year, roll);
      if (!result) {
        consecutiveFails++;
        if (consecutiveFails > 20) {
          console.log(`Stopping at roll ${roll} for ${year} (too many misses)`);
          break;
        }
        continue;
      }
      consecutiveFails = 0;

      const doc = new DOMParser().parseFromString(result.xml, 'text/xml');
      const members = doc.getElementsByTagName('recorded-vote');

      for (let j = 0; j < members.length; j++) {
        const m = members.item(j);
        const legislator = m.getElementsByTagName('legislator')[0];
        const first = legislator?.getAttribute('first');
        const last = legislator?.getAttribute('last');
        const state = legislator?.getAttribute('state');
        const district = legislator?.getAttribute('district');
        const voteCast = m.getElementsByTagName('vote')[0]?.textContent;

        const bioguide = findBioguide(first, last, state, district);
        if (!bioguide || !voteCast) continue;
        if (!repMap.has(bioguide)) continue;

        const rep = repMap.get(bioguide);
        rep.totalVotes++;

        const pos = voteCast.toLowerCase();
        if (pos === 'yea' || pos === 'yes') rep.yeaVotes++;
        else if (pos === 'nay' || pos === 'no') rep.nayVotes++;
        else rep.missedVotes++;

        attached++;
      }
    }
  }

  // Compute percentages
  for (const r of reps) {
    if (r.totalVotes > 0) {
      const participated = r.yeaVotes + r.nayVotes;
      r.participationPct = Number(((participated / r.totalVotes) * 100).toFixed(2));
      r.missedVotePct = Number(((r.missedVotes / r.totalVotes) * 100).toFixed(2));
    }
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(reps, null, 2));
  console.log(`House votes updated: ${attached} member-votes attached`);
})();
