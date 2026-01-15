// scripts/votes-reps-scraper.js
// Purpose: Parse House roll call votes and merge into representatives-rankings.json
// Input: public/house-votes-rollcalls.json (array of roll calls with members list)

const fs = require('fs');
const path = require('path');

const OUT_PATH = path.join(__dirname, '..', 'public', 'representatives-rankings.json');
const VOTES_PATH = path.join(__dirname, '..', 'public', 'house-votes-rollcalls.json');

function ensureRepShape(rep) {
  return {
    name: rep.name,
    bioguideId: rep.bioguideId,
    state: rep.state,
    party: rep.party,
    office: rep.office || 'Representative',
    sponsoredBills: rep.sponsoredBills || 0,
    cosponsoredBills: rep.cosponsoredBills || 0,
    sponsoredAmendments: rep.sponsoredAmendments || 0,
    cosponsoredAmendments: rep.cosponsoredAmendments || 0,
    yeaVotes: rep.yeaVotes || 0,
    nayVotes: rep.nayVotes || 0,
    missedVotes: rep.missedVotes || 0,
    totalVotes: rep.totalVotes || 0,
    committees: Array.isArray(rep.committees) ? rep.committees : [],
    participationPct: rep.participationPct || 0,
    missedVotePct: rep.missedVotePct || 0,
    rawScore: rep.rawScore || 0,
    scoreNormalized: rep.scoreNormalized || 0,
  };
}

function indexByBioguide(list) {
  const map = new Map();
  list.forEach(r => {
    if (r.bioguideId) map.set(r.bioguideId, r);
  });
  return map;
}

(function main() {
  const reps = JSON.parse(fs.readFileSync(OUT_PATH, 'utf-8')).map(ensureRepShape);

  let rollcalls;
  try {
    rollcalls = JSON.parse(fs.readFileSync(VOTES_PATH, 'utf-8'));
  } catch (e) {
    console.error('House votes failed:', e.message);
    process.exit(1);
  }

  if (!Array.isArray(rollcalls)) {
    console.error('House votes file must be an array of roll call objects.');
    process.exit(1);
  }

  const repMap = indexByBioguide(reps);

  // Expected roll call shape:
  // {
  //   voteId: "vote_119_1_00001",
  //   members: [
  //     { bioguideId: "A000055", vote: "Yea" | "Nay" | "Not Voting" }
  //   ]
  // }
  let processed = 0;
  rollcalls.forEach(rc => {
    const members = Array.isArray(rc.members) ? rc.members : [];
    members.forEach(m => {
      const rep = repMap.get(m.bioguideId);
      if (!rep) return;
      if (m.vote === 'Yea') rep.yeaVotes += 1;
      else if (m.vote === 'Nay') rep.nayVotes += 1;
      else rep.missedVotes += 1; // Not Voting
      rep.totalVotes += 1;
    });
    processed += 1;
  });

  const updated = reps.map(r => {
    const total = r.totalVotes;
    const missed = r.missedVotes;
    const participationPct = total > 0 ? Math.round(((total - missed) / total) * 10000) / 100 : 0;
    const missedVotePct = total > 0 ? Math.round((missed / total) * 10000) / 100 : 0;
    return ensureRepShape({ ...r, participationPct, missedVotePct });
  });

  fs.writeFileSync(OUT_PATH, JSON.stringify(updated, null, 2));
  console.log(`House votes updated: ${processed} roll calls processed`);
})();
