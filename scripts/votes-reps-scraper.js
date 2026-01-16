// scripts/votes-reps-scraper.js
// Purpose: Pull House votes for the 119th Congress via Congress.gov API
// Updates representatives-rankings.json with yea/nay/missed totals and participation percentages

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const OUT_PATH = path.join(__dirname, '..', 'public', 'representatives-rankings.json');
const API_KEY = process.env.CONGRESS_API_KEY;
const BASE = 'https://api.congress.gov/v3';
const CONGRESS = 119;
const SESSIONS = [1, 2];

function ensureRepShape(rep) {
  rep.yeaVotes = rep.yeaVotes || 0;
  rep.nayVotes = rep.nayVotes || 0;
  rep.missedVotes = rep.missedVotes || 0;
  rep.totalVotes = rep.totalVotes || 0;
  rep.participationPct = rep.participationPct || 0;
  rep.missedVotePct = rep.missedVotePct || 0;
  return rep;
}

async function fetchAllPages(url, itemKey) {
  let results = [];
  let next = url;
  while (next) {
    const res = await fetch(next);
    if (!res.ok) {
      console.error(`Bad response for ${next}: ${res.status}`);
      break;
    }
    const data = await res.json();
    const items = data?.[itemKey] || [];
    results = results.concat(items);
    next = data?.pagination?.next_url
      ? `${BASE}${data.pagination.next_url}&api_key=${API_KEY}`
      : null;
  }
  return results;
}

(function main() {
  if (!API_KEY) {
    console.error('Missing CONGRESS_API_KEY');
    process.exit(1);
  }

  const reps = JSON.parse(fs.readFileSync(OUT_PATH, 'utf-8')).map(ensureRepShape);
  const repMap = new Map(reps.map(r => [r.bioguideId, r]));

  let processed = 0;
  let attached = 0;

  (async () => {
    for (const session of SESSIONS) {
      // List all votes for the session
      const listUrl = `${BASE}/house-vote/${CONGRESS}/${session}?api_key=${API_KEY}`;
      const votes = await fetchAllPages(listUrl, 'votes');

      for (const v of votes) {
        const voteNumber = v.voteNumber;
        if (!voteNumber) continue;

        // Fetch member positions for this vote
        const membersUrl = `${BASE}/house-vote/${CONGRESS}/${session}/${voteNumber}/members?api_key=${API_KEY}`;
        const res = await fetch(membersUrl);
        if (!res.ok) {
          console.error(`Members fetch failed for vote ${voteNumber} (session ${session}): ${res.status}`);
          continue;
        }
        const data = await res.json();
        const members = data?.members || [];

        for (const m of members) {
          const id = m.bioguideId;
          if (!id || !repMap.has(id)) continue;

          const rep = repMap.get(id);
          rep.totalVotes++;

          const pos = (m.votePosition || '').toLowerCase();
          if (pos === 'yea' || pos === 'yes') rep.yeaVotes++;
          else if (pos === 'nay' || pos === 'no') rep.nayVotes++;
          else rep.missedVotes++; // treat present/not voting as missed for participation

          attached++;
        }

        processed++;
      }
    }

    // Compute participation/missed percentages
    for (const r of reps) {
      if (r.totalVotes > 0) {
        const participated = r.yeaVotes + r.nayVotes;
        r.participationPct = Number(((participated / r.totalVotes) * 100).toFixed(2));
        r.missedVotePct = Number(((r.missedVotes / r.totalVotes) * 100).toFixed(2));
      }
    }

    fs.writeFileSync(OUT_PATH, JSON.stringify(reps, null, 2));
    console.log(`House votes updated: ${processed} roll calls processed; ${attached} member-votes attached`);
  })().catch(err => {
    console.error('House votes scraper failed:', err);
    process.exit(1);
  });
})();
