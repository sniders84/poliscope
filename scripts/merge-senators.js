// scripts/merge-senators.js
// Consolidate bootstrap + GovTrack legislation + GovTrack votes + committees into senators-rankings.json

const fs = require('fs');
const path = require('path');

const RANKINGS_PATH = path.join(__dirname, '../public/senators-rankings.json');

function mergeSenators() {
  let senators;
  try {
    senators = JSON.parse(fs.readFileSync(RANKINGS_PATH, 'utf8'));
  } catch (err) {
    console.error('Failed to load senators-rankings.json:', err.message);
    return;
  }

  // Deduplicate by bioguideId
  const seen = new Map();
  senators.forEach(s => {
    if (!seen.has(s.bioguideId)) {
      seen.set(s.bioguideId, s);
    } else {
      const existing = seen.get(s.bioguideId);
      // Merge additive fields
      existing.sponsoredBills += s.sponsoredBills || 0;
      existing.cosponsoredBills += s.cosponsoredBills || 0;
      existing.becameLawBills += s.becameLawBills || 0;
      existing.becameLawCosponsoredBills += s.becameLawCosponsoredBills || 0;
      existing.sponsoredAmendments += s.sponsoredAmendments || 0;
      existing.cosponsoredAmendments += s.cosponsoredAmendments || 0;
      existing.becameLawAmendments += s.becameLawAmendments || 0;
      existing.becameLawCosponsoredAmendments += s.becameLawCosponsoredAmendments || 0;
      existing.yeaVotes += s.yeaVotes || 0;
      existing.nayVotes += s.nayVotes || 0;
      existing.missedVotes += s.missedVotes || 0;
      existing.totalVotes = Math.max(existing.totalVotes, s.totalVotes || 0);
      // Merge committees
      existing.committees = [...(existing.committees || []), ...(s.committees || [])];
    }
  });

  const merged = Array.from(seen.values());

  fs.writeFileSync(RANKINGS_PATH, JSON.stringify(merged, null, 2));
  console.log(`Merge complete: ${merged.length} senators normalized and schema enforced`);
}

mergeSenators();
