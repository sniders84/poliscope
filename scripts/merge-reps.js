// scripts/merge-reps.js
// Purpose: Consolidate representatives-rankings.json (dedupe + ensure office + metrics)

const fs = require('fs');
const path = require('path');

const OUT_PATH = path.join(__dirname, '..', 'public', 'representatives-rankings.json');

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

(function main() {
  const reps = JSON.parse(fs.readFileSync(OUT_PATH, 'utf-8')).map(ensureRepShape);

  const seen = new Map();
  reps.forEach(r => {
    const key = r.bioguideId || r.name;
    if (!seen.has(key)) {
      seen.set(key, r);
    } else {
      const a = seen.get(key);
      // Merge additive fields
      a.sponsoredBills += r.sponsoredBills;
      a.cosponsoredBills += r.cosponsoredBills;
      a.sponsoredAmendments += r.sponsoredAmendments;
      a.cosponsoredAmendments += r.cosponsoredAmendments;
      a.yeaVotes += r.yeaVotes;
      a.nayVotes += r.nayVotes;
      a.missedVotes += r.missedVotes;
      a.totalVotes += r.totalVotes;
      // Merge committees (dedupe by code+role)
      const existing = new Set(a.committees.map(c => `${c.committeeCode}|${c.role}`));
      r.committees.forEach(c => {
        const key = `${c.committeeCode}|${c.role}`;
        if (!existing.has(key)) a.committees.push(c);
      });
    }
  });

  const merged = Array.from(seen.values()).map(r => {
    const total = r.totalVotes;
    const missed = r.missedVotes;
    const participationPct = total > 0 ? Math.round(((total - missed) / total) * 10000) / 100 : 0;
    const missedVotePct = total > 0 ? Math.round((missed / total) * 10000) / 100 : 0;
    return ensureRepShape({ ...r, participationPct, missedVotePct });
  });

  fs.writeFileSync(OUT_PATH, JSON.stringify(merged, null, 2));
  console.log(`Merge complete: ${merged.length} representatives total`);
  console.log(`- Legislation merged for ${merged.length} representatives`);
  console.log(`- Votes merged for ${merged.filter(r => r.totalVotes > 0).length} representatives (with any vote data)`);
})();
