// votes-scraper.js
// Reads LegiScan bulk roll call JSON for 119th Congress
// Outputs public/senators-votes.json

const fs = require('fs');
const path = require('path');

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

// Path to LegiScan roll call dataset (JSON file you mirror nightly)
const VOTES_DIR = 'public/rollcalls-119'; // directory containing roll call JSON files

function loadRollCalls(dir) {
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  const rollcalls = [];
  for (const file of files) {
    const data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    if (data.roll_call && data.roll_call.chamber === 'S') { // Senate only
      rollcalls.push(data.roll_call);
    }
  }
  return rollcalls;
}

async function run() {
  const totals = new Map();
  for (const s of senators) {
    totals.set(s.id.bioguide, { votesCast: 0, missedVotes: 0 });
  }

  const rollcalls = loadRollCalls(VOTES_DIR);

  for (const rc of rollcalls) {
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
