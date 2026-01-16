// scripts/votes-reps-scraper.js
// Purpose: Scrape House votes from Congress.gov vote pages and update representatives-rankings.json

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

const OUT_PATH = path.join(__dirname, '..', 'public', 'representatives-rankings.json');

// Adjust to current Congress/session
const CONGRESS = 119;
const SESSION = 2;   // <-- update this to the current session
const MAX_VOTE = 500; // upper bound of roll calls to attempt

function ensureRepShape(rep) {
  rep.yeaVotes = rep.yeaVotes || 0;
  rep.nayVotes = rep.nayVotes || 0;
  rep.missedVotes = rep.missedVotes || 0;
  rep.totalVotes = rep.totalVotes || 0;
  rep.participationPct = rep.participationPct || 0;
  rep.missedVotePct = rep.missedVotePct || 0;
  return rep;
}

function indexByBioguide(list) {
  const map = new Map();
  for (const r of list) {
    if (r.bioguideId) map.set(r.bioguideId, r);
  }
  return map;
}

async function fetchVotePage(num) {
  const url = `https://www.congress.gov/votes/house/${CONGRESS}-${SESSION}/${num}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`Vote page ${url} returned ${res.status}`);
    return null;
  }
  const html = await res.text();
  return cheerio.load(html);
}

(async function main() {
  const reps = JSON.parse(fs.readFileSync(OUT_PATH, 'utf-8')).map(ensureRepShape);
  const repMap = indexByBioguide(reps);

  let processed = 0;
  let attached = 0;

  for (let i = 1; i <= MAX_VOTE; i++) {
    const $ = await fetchVotePage(i);
    if (!$) continue;

    const groups = [
      { selector: 'section#yeas li a', choice: 'Yea' },
      { selector: 'section#nays li a', choice: 'Nay' },
      { selector: 'section#not-voting li a', choice: 'Not Voting' },
      { selector: 'section#present li a', choice: 'Present' }
    ];

    for (const g of groups) {
      $(g.selector).each((_, el) => {
        const href = $(el).attr('href') || '';
        const match = href.match(/\/member\/([A-Z0-9]+)/);
        if (!match) return;
        const bioguideId = match[1];
        if (!repMap.has(bioguideId)) return;

        const rep = repMap.get(bioguideId);
        rep.totalVotes++;
        if (g.choice === 'Yea') rep.yeaVotes++;
        else if (g.choice === 'Nay') rep.nayVotes++;
        else rep.missedVotes++; // treat Not Voting/Present as missed
        attached++;
      });
    }

    processed++;
  }

  for (const r of reps) {
    if (r.totalVotes > 0) {
      const participated = r.yeaVotes + r.nayVotes;
      r.participationPct = Number(((participated / r.totalVotes) * 100).toFixed(2));
      r.missedVotePct = Number(((r.missedVotes / r.totalVotes) * 100).toFixed(2));
    }
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(reps, null, 2));
  console.log(`House votes updated: ${processed} vote pages processed; ${attached} member-votes attached`);
})().catch(err => {
  console.error('House votes scraper failed:', err);
  process.exit(1);
});
