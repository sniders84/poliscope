// scripts/merge-reps.js
// Purpose: Merge House representative data into a unified rankings file for the 119th Congress

const fs = require('fs');
const path = require('path');

const OUT_PATH = path.join(__dirname, '..', 'public', 'representatives-rankings.json');

// Inputs: each scraper writes its own JSON file
const LEGIS_PATH = path.join(__dirname, '..', 'public', 'representatives-legislation.json');
const COMM_PATH  = path.join(__dirname, '..', 'public', 'representatives-committees.json');
const VOTES_PATH = path.join(__dirname, '..', 'public', 'representatives-votes.json');

function normalize(rep) {
  return {
    name: rep.name,
    bioguideId: rep.bioguideId,
    state: rep.state,
    district: rep.district,
    party: rep.party,
    sponsoredBills: rep.sponsoredBills || 0,
    cosponsoredBills: rep.cosponsoredBills || 0,
    sponsoredAmendments: rep.sponsoredAmendments || 0,
    cosponsoredAmendments: rep.cosponsoredAmendments || 0,
    becameLawBills: rep.becameLawBills || 0,
    becameLawAmendments: rep.becameLawAmendments || 0,
    becameLawCosponsoredAmendments: rep.becameLawCosponsoredAmendments || 0,
    committees: rep.committees || [],
    yeaVotes: rep.yeaVotes || 0,
    nayVotes: rep.nayVotes || 0,
    missedVotes: rep.missedVotes || 0,
    totalVotes: rep.totalVotes || 0,
    participationPct: rep.participationPct || 0,
    missedVotePct: rep.missedVotePct || 0,
    rawScore: rep.rawScore || 0,
    score: rep.score || 0,
    scoreNormalized: rep.scoreNormalized || 0
  };
}

(function main() {
  const legis = fs.existsSync(LEGIS_PATH) ? JSON.parse(fs.readFileSync(LEGIS_PATH)) : [];
  const comms = fs.existsSync(COMM_PATH)  ? JSON.parse(fs.readFileSync(COMM_PATH))  : [];
  const votes = fs.existsSync(VOTES_PATH) ? JSON.parse(fs.readFileSync(VOTES_PATH)) : [];

  const map = new Map();
  for (const r of legis) map.set(r.bioguideId, normalize(r));

  for (const r of comms) {
    if (!map.has(r.bioguideId)) map.set(r.bioguideId, normalize(r));
    map.get(r.bioguideId).committees = r.committees || [];
  }

  for (const r of votes) {
    if (!map.has(r.bioguideId)) map.set(r.bioguideId, normalize(r));
    Object.assign(map.get(r.bioguideId), {
      yeaVotes: r.yeaVotes || 0,
      nayVotes: r.nayVotes || 0,
      missedVotes: r.missedVotes || 0,
      totalVotes: r.totalVotes || 0,
      participationPct: r.participationPct || 0,
      missedVotePct: r.missedVotePct || 0
    });
  }

  const merged = Array.from(map.values());

  fs.writeFileSync(OUT_PATH, JSON.stringify(merged, null, 2));
  console.log(`Merge complete: ${merged.length} representatives normalized and schema enforced for Congress ${119}`);
})();
