// scripts/votes-senators-scraper.js
// Purpose: Scrape Senate roll call votes for the 119th Congress (2025 + 2026)
// Enriches senators-rankings.json with yea/nay/missed tallies

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const { DOMParser } = require('@xmldom/xmldom');

const OUT_PATH = path.join(__dirname, '..', 'public', 'senators-rankings.json');
const ROSTER_PATH = path.join(__dirname, '..', 'public', 'legislators-current.json');

const SESSIONS = [2025, 2026];
const roster = JSON.parse(fs.readFileSync(ROSTER_PATH, 'utf-8'));

function ensureVoteShape(sen) {
  sen.yeaVotes = sen.yeaVotes || 0;
  sen.nayVotes = sen.nayVotes || 0;
  sen.missedVotes = sen.missedVotes || 0;
  sen.totalVotes = sen.totalVotes || 0;
  sen.participationPct = sen.participationPct || 0;
  sen.missedVotePct = sen.missedVotePct || 0;
  return sen;
}

function findBioguideFlexible({ bioguideAttr, last, state }) {
  if (bioguideAttr) {
    const match = roster.find(r => r.id.bioguide === bioguideAttr);
    return match?.id.bioguide;
  }
  const match = roster.find(r => {
    const t = r.terms[r.terms.length - 1];
    return (
      r.name.last.toLowerCase() === (last || '').toLowerCase() &&
      t?.state === state &&
      t?.type === 'sen'
    );
  });
  return match?.id.bioguide;
}

async function fetchRoll(year, roll) {
  const rollStr = String(roll).padStart(5, '0'); // Senate roll call numbers are 5 digits
  const url = `https://www.senate.gov/legislative/LIS/roll_call_votes/vote${year}${String(rollStr)}.xml`;
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

      const doc = new DOMParser().parseFromString(result.xml, 'text/xml');
      const members = doc.getElementsByTagName('member');

      for (let j = 0; j < members.length; j++) {
        const m = members.item(j);
        const bioguideAttr = m.getAttribute('lis_member_id'); // Senate LIS ID
        const last = m.getElementsByTagName('last_name')[0]?.textContent;
        const state = m.getElementsByTagName('state')[0]?.textContent;
        const voteCast = m.getElementsByTagName('vote_cast')[0]?.textContent;

        if (!voteCast) continue;

        const bioguide = findBioguideFlexible({ bioguideAttr, last, state });
        if (!bioguide || !senMap.has(bioguide)) continue;

        const sen = senMap.get(bioguide);
        sen.totalVotes++;

        const pos = voteCast.toLowerCase();
        if (pos === 'yea' || pos === 'yes') sen.yeaVotes++;
        else if (pos === 'nay' || pos === 'no') sen.nayVotes++;
        else sen.missedVotes++;

        attached++;
      }
    }
  }

  // Compute percentages
  for (const s of sens) {
    if (s.totalVotes > 0) {
      const participated = s.yeaVotes + s.nayVotes;
      s.participationPct = Number(((participated / s.totalVotes) * 100).toFixed(2));
      s.missedVotePct = Number(((s.missedVotes / s.totalVotes) * 100).toFixed(2));
    }
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(sens, null, 2));
  console.log(`Senate votes updated: ${attached} member-votes attached`);
})();
