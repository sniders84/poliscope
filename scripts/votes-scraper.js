// votes-scraper.js
// Downloads LegiScan bulk dataset ZIP via API key, extracts votes.json
// Outputs public/senators-votes.json

const fs = require('fs');
const fetch = require('node-fetch');
const AdmZip = require('adm-zip');

const API_KEY = process.env.CONGRESS_API_KEY;
const DATASET_URL = `https://api.legiscan.com/dl/?key=${API_KEY}&session=2199`;

const legislators = JSON.parse(fs.readFileSync('public/legislators-current.json', 'utf8'));
const senators = legislators.filter(l => l.terms.some(t => t.type === 'sen'));
const byGovtrack = new Map(senators.map(s => [String(s.id.govtrack), s.id.bioguide]));

async function getVotes() {
  console.log('Downloading LegiScan bulk ZIP...');
  const res = await fetch(DATASET_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${DATASET_URL}`);
  const buffer = await res.buffer();

  const zip = new AdmZip(buffer);
  const entry = zip.getEntry('votes.json');
  if (!entry) throw new Error('votes.json not found in dataset');
  return JSON.parse(entry.getData().toString('utf8'));
}

async function run() {
  const votesData = await getVotes();

  const totals = new Map();
  for (const s of senators) {
    totals.set(s.id.bioguide, { votesCast: 0, missedVotes: 0 });
  }

  for (const rc of votesData) {
    if (rc.chamber !== 'S') continue;
    for (const v of rc.votes) {
      const bioguideId = byGovtrack.get(String(v.people_id));
      if (!bioguideId || !totals.has(bioguideId)) continue;

      const entry = totals.get(bioguideId);
      if (/yea|nay|present/i.test(v.vote_text)) {
        entry.votesCast++;
      } else if (/absent|not voting/i.test(v.vote_text)) {
        entry.missedVotes++;
      }
    }
  }

  const results = Array.from(totals.entries()).map(([bioguideId, t]) => {
    const total = t.votesCast + t.missedVotes;
    const missedPct = total > 0 ? (t.missedVotes / total) * 100 : 0;
    return { bioguideId, ...t, missedPct: Number(missedPct.toFixed(2)) };
  });

  fs.writeFileSync('public/senators-votes.json', JSON.stringify(results, null, 2));
  console.log('Votes scraper complete!');
}

run().catch(err => console.error(err));
