// votes-scraper.js
// Uses LegiScan API with API key from secrets
// Outputs public/senators-votes.json

const fs = require('fs');
const fetch = require('node-fetch');

const API_KEY = process.env.LEGISCAN_API_KEY;
const MASTERLIST_URL = `https://api.legiscan.com/?key=${API_KEY}&op=getMasterList&state=US`;

const legislators = JSON.parse(fs.readFileSync('public/legislators-current.json', 'utf8'));
const senators = legislators.filter(l => l.terms.some(t => t.type === 'sen'));
const byGovtrack = new Map(senators.map(s => [String(s.id.govtrack), s.id.bioguide]));

async function run() {
  console.log('Fetching LegiScan MasterList for votes...');
  const res = await fetch(MASTERLIST_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${MASTERLIST_URL}`);
  const data = await res.json();

  const totals = new Map();
  for (const s of senators) {
    totals.set(s.id.bioguide, { votesCast: 0, missedVotes: 0 });
  }

  for (const bill of Object.values(data.masterlist)) {
    if (Number(bill.congress) !== 119) continue;
    if (!bill.rollcalls) continue;

    for (const rc of bill.rollcalls) {
      if (rc.chamber !== 'S') continue;
      for (const v of rc.votes) {
        const bioguideId = byGovtrack.get(String(v.people_id));
        if (!bioguideId || !totals.has(bioguideId)) continue;

        const entry = totals.get(bioguideId);
        if (/yea|nay|present/i.test(v.vote_text)) {
          entry.votesCast += 1;
        } else if (/absent|not voting/i.test(v.vote_text)) {
          entry.missedVotes += 1;
        }
      }
    }
  }

  const results = [];
  for (const [bioguideId, t] of totals.entries()) {
    const missedPct = t.votesCast + t.missedVotes > 0
      ? (t.missedVotes / (t.votesCast + t.missedVotes)) * 100
      : 0;
    results.push({ bioguideId, ...t, missedPct: Number(missedPct.toFixed(2)) });
  }

  fs.writeFileSync('public/senators-votes.json', JSON.stringify(results, null, 2));
  console.log('Votes scraper complete!');
}

run().catch(err => console.error(err));
