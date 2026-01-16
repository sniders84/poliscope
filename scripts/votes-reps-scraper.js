// scripts/votes-reps-scraper.js
// Purpose: Scrape House roll call votes for the 119th Congress (sessions 2025 + 2026)
// Uses Clerk index pages to find all published roll calls, then parses XML
// Updates representatives-rankings.json with yea/nay/missed tallies

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const { DOMParser } = require('@xmldom/xmldom');

const OUT_PATH = path.join(__dirname, '..', 'public', 'representatives-rankings.json');
const ROSTER_PATH = path.join(__dirname, '..', 'public', 'legislators-current.json');

// Correct index pages for House votes
const INDEX_URLS = [
  'https://clerk.house.gov/evs/2025/index.asp',
  'https://clerk.house.gov/evs/2026/index.asp'
];

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

async function getRollUrls(indexUrl) {
  const res = await fetch(indexUrl);
  if (!res.ok) {
    console.error(`Failed to fetch index ${indexUrl}: ${res.status}`);
    return [];
  }
  const html = await res.text();
  // Extract roll call XML links like /evs/2025/roll428.xml
  const regex = /\/evs\/\d{4}\/roll\d{3}\.xml/g;
  const matches = html.match(regex) || [];
  return matches.map(m => `https://clerk.house.gov${m}`);
}

(async function main() {
  const reps = JSON.parse(fs.readFileSync(OUT_PATH, 'utf-8')).map(ensureRepShape);
  const repMap = new Map(reps.map(r => [r.bioguideId, r]));

  let attached = 0;

  for (const indexUrl of INDEX_URLS) {
    const rollUrls = await getRollUrls(indexUrl);
    console.log(`Found ${rollUrls.length} roll calls at ${indexUrl}`);

    for (const url of rollUrls) {
      let res;
      try {
        res = await fetch(url);
      } catch (err) {
        console.error(`Fetch failed for ${url}: ${err.message}`);
        continue;
      }
      if (!res.ok) {
        console.error(`Bad response ${res.status} for ${url}`);
        continue;
      }

      const xml = await res.text();
      const doc = new DOMParser().parseFromString(xml, 'text/xml');
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
