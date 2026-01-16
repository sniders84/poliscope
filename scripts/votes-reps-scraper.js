// scripts/votes-reps-scraper.js
// Purpose: Scrape House roll call votes from Clerk XML feeds for the 119th Congress (sessions 1 & 2)
// Updates representatives-rankings.json with yea/nay/missed totals and participation percentages

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const { DOMParser } = require('@xmldom/xmldom');

const OUT_PATH = path.join(__dirname, '..', 'public', 'representatives-rankings.json');
const CONGRESS = 119;
const YEARS = [2025, 2026]; // Session 1 and Session 2
const MAX_VOTE = 1000;      // safe upper bound of roll calls to attempt

function ensureRepShape(rep) {
  rep.yeaVotes = rep.yeaVotes || 0;
  rep.nayVotes = rep.nayVotes || 0;
  rep.missedVotes = rep.missedVotes || 0;
  rep.totalVotes = rep.totalVotes || 0;
  rep.participationPct = rep.participationPct || 0;
  rep.missedVotePct = rep.missedVotePct || 0;
  return rep;
}

(async function main() {
  const reps = JSON.parse(fs.readFileSync(OUT_PATH, 'utf-8')).map(ensureRepShape);
  const repMap = new Map(reps.map(r => [r.bioguideId, r]));

  let processed = 0;
  let attached = 0;

  for (const year of YEARS) {
    for (let i = 1; i <= MAX_VOTE; i++) {
      const roll = String(i).padStart(3, '0');
      const url = `https://clerk.house.gov/evs/${year}/roll${roll}.xml`;

      let res;
      try {
        res = await fetch(url);
      } catch (err) {
        console.error(`Fetch failed for ${url}: ${err.message}`);
        continue;
      }
      if (!res.ok) {
        if (res.status !== 404) console.error(`Bad response ${res.status} for ${url}`);
        continue; // skip 404s gracefully
      }

      const xml = await res.text();
      const doc = new DOMParser().parseFromString(xml, 'text/xml');
      const members = doc.getElementsByTagName('recorded-vote');

      if (!members || members.length === 0) continue;

      for (let j = 0; j < members.length; j++) {
        const m = members.item(j);
        const legislatorNode = m.getElementsByTagName('legislator')[0];
        const id = legislatorNode?.getAttribute('name-id'); // Clerk LIS ID
        const voteCast = m.getElementsByTagName('vote')[0]?.textContent;

        if (!id || !voteCast) continue;
        if (!repMap.has(id)) continue; // requires LIS→bioguide mapping

        const rep = repMap.get(id);
        rep.totalVotes++;

        const pos = voteCast.toLowerCase();
        if (pos === 'yea' || pos === 'yes') rep.yeaVotes++;
        else if (pos === 'nay' || pos === 'no') rep.nayVotes++;
        else rep.missedVotes++;

        attached++;
      }

      processed++;
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
  console.log(`House votes updated: ${processed} roll calls processed; ${attached} member-votes attached`);
})();
