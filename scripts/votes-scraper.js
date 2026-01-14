// votes-scraper.js
// Fetches LegiScan 119th Congress dataset ZIP, extracts votes.json
// Outputs public/senators-votes.json

const fs = require('fs');
const fetch = require('node-fetch');
const AdmZip = require('adm-zip');

// Load legislators metadata
const legislators = JSON.parse(fs.readFileSync('public/legislators-current.json', 'utf8'));
const senators = legislators.filter(l => l.terms.some(t => t.type === 'sen'));

// Build mapping: govtrack -> bioguide
const byGovtrack = new Map();
for (const s of senators) {
  if (s.id.govtrack) {
    byGovtrack.set(String(s.id.govtrack), s.id.bioguide);
  }
}

// LegiScan dataset ZIP URL (119th Congress)
const DATASET_URL = 'https://legiscan.com/gaits/datasets/2199/json/US_2025-2026_119th_Congress_JSON_20260109_68e7bd7db67acea9876b963a8a573396.zip';

async function getVotes() {
  console.log('Downloading LegiScan 119th Congress ZIP...');
  const res = await fetch(DATASET_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${DATASET_URL}`);
  const buffer = await res.buffer();

  const zip = new AdmZip(buffer);
  const entry = zip.getEntry('votes.json');
  if (!entry) throw new Error('votes.json not found in dataset');
  const votes = JSON.parse(entry.getData().toString('utf8'));
  return votes;
}

async function run() {
  const votesData = await getVotes();

  // Senate rollcalls only
  const rollcalls119 = votesData.filter(v => v.chamber === 'S');

  const totals = new Map();
  for (const s of senators) {
    totals.set(s.id.bioguide, { votesCast: 0, missedVotes: 0 });
  }

  for (const rc of rollcalls119) {
    for (const v of rc.votes) {
      const govtrackId = String(v.people_id);
      const bioguideId = byGovtrack.get(govtrackId);
      if (!bioguideId || !totals.has(bioguideId)) continue;

      const entry = totals.get(bioguideId);
      if (/yea|nay|present/i.test(v.vote_text)) {
        entry.votesCast += 1;
      } else if (/absent|not voting/i.test(v.vote_text)) {
        entry.missedVotes += 1;
      }
    }
  }

  const results = [];
  for (const [bioguideId, t] of totals.entries()) {
    const missedPct = t.votesCast + t.missedVotes > 0
      ? (t.missedVotes / (t.votesCast + t.missedVotes)) * 100
      : 0;
    results.push({
      bioguideId,
      votesCast: t.votesCast,
      missedVotes: t.missedVotes,
      missedPct: Number(missedPct.toFixed(2)),
    });
  }

  fs.writeFileSync('public/senators-votes.json', JSON.stringify(results, null, 2));
  console.log('Votes scraper complete!');
}

run().catch(err => console.error(err));
