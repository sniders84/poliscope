// scripts/votes-reps-scraper.js
// Purpose: Scrape House roll call votes for the 119th Congress (2025 + 2026)
// Enriches representatives-rankings.json with yea/nay/missed tallies

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const { DOMParser } = require('@xmldom/xmldom');

const OUT_PATH = path.join(__dirname, '..', 'public', 'representatives-rankings.json');
const ROSTER_PATH = path.join(__dirname, '..', 'public', 'legislators-current.json');

const SESSIONS = [2025, 2026];
const CONGRESS = 119;

const roster = JSON.parse(fs.readFileSync(ROSTER_PATH, 'utf-8'));

function termForCongress(rep, congress) {
  // Prefer the House term for the target Congress
  const t = rep.terms.find(x => x.type === 'rep' && x.congress === congress);
  return t || rep.terms[rep.terms.length - 1];
}

function findBioguideFlexible({ bioguideAttr, last, state, district }) {
  // Prefer direct bioguide when present
  if (bioguideAttr) {
    const match = roster.find(r => r.id.bioguide === bioguideAttr);
    return match?.id.bioguide;
  }
  // Fallback: last + state + district against the 119th term
  const match = roster.find(r => {
    const t = termForCongress(r, CONGRESS);
    return (
      r.name.last.toLowerCase() === (last || '').toLowerCase() &&
      t?.state === state &&
      String(t?.district || 'At-Large') === String(district || 'At-Large')
    );
  });
  return match?.id.bioguide;
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
    const res = await fetch(url);
    if (!res.ok) return null;
    const xml = await res.text();
    return { url, xml };
  } catch {
    return null;
  }
}

(async function main() {
  const reps = JSON.parse(fs.readFileSync(OUT_PATH, 'utf-8')).map(ensureVoteShape);
  const repMap = new Map(reps.map(r => [r.bioguideId, r]));

  let attached = 0;

  for (const year of SESSIONS) {
    console.log(`Scanning roll calls for ${year}...`);
    let consecutiveFails = 0;

    for (let roll = 1; roll <= 1200; roll++) {
      const result = await fetchRoll(year, roll);
      if (!result) {
        consecutiveFails++;
        // Clerk roll numbers have long gaps—use a generous threshold
        if (consecutiveFails > 200) {
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

        const bioguideAttr = legislator?.getAttribute('name-id'); // Clerk bioguide when present
        const last = legislator?.getAttribute('last') || legislator?.getAttribute('sort-field');
        const state = legislator?.getAttribute('state');
        const district = legislator?.getAttribute('district');
        const voteCast = m.getElementsByTagName('vote')[0]?.textContent;

        if (!voteCast || (!bioguideAttr && (!last || !state))) continue;

        const bioguide = findBioguideFlexible({ bioguideAttr, last, state, district });
        if (!bioguide || !repMap.has(bioguide)) continue;

        const rep = repMap.get(bioguide);
        rep.totalVotes++;

        const pos = voteCast.toLowerCase();
        if (pos === 'yea' || pos === 'yes') rep.yeaVotes++;
        else if (pos === 'nay' || pos === 'no') rep.nayVotes++;
        else rep.missedVotes++; // includes 'not voting', 'present', etc.

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
