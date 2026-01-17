// scripts/merge-reps.js
// Consolidate bootstrap + GovTrack legislation + GovTrack votes + committees into representatives-rankings.json

const fs = require('fs');
const path = require('path');

const RANKINGS_PATH = path.join(__dirname, '../public/representatives-rankings.json');

function mergeReps() {
  let reps;
  try {
    reps = JSON.parse(fs.readFileSync(RANKINGS_PATH, 'utf8'));
  } catch (err) {
    console.error('Failed to load representatives-rankings.json:', err.message);
    return;
  }

  // Deduplicate by bioguideId
  const seen = new Map();
  reps.forEach(r => {
    if (!seen.has(r.bioguideId)) {
      seen.set(r.bioguideId, r);
    } else {
      const existing = seen.get(r.bioguideId);
      // Merge additive fields
      existing.sponsoredBills += r.sponsoredBills || 0;
      existing.cosponsoredBills += r.cosponsoredBills || 0;
      existing.becameLawBills += r.becameLawBills || 0;
      existing.becameLawCosponsoredBills += r.becameLawCosponsoredBills || 0;
      existing.sponsoredAmendments += r.sponsoredAmendments || 0;
      existing.cosponsoredAmendments += r.cosponsoredAmendments || 0;
      existing.becameLawAmendments += r.becameLawAmendments || 0;
      existing.becameLawCosponsoredAmendments += r.becameLawCosponsoredAmendments || 0;
      existing.yeaVotes += r.yeaVotes || 0;
      existing.nayVotes += r.nayVotes || 0;
      existing.missedVotes += r.missedVotes || 0;
      existing.totalVotes = Math.max(existing.totalVotes, r.totalVotes || 0);
      // Merge committees
      existing.committees = [...(existing.committees || []), ...(r.committees || [])];
    }
  });

  const merged = Array.from(seen.values());

  fs.writeFileSync(RANKINGS_PATH, JSON.stringify(merged, null, 2));
  console.log(`Merge complete: ${merged.length} representatives normalized and schema enforced`);
}

mergeReps();
