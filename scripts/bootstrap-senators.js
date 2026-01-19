
// scripts/bootstrap-senators.js
// Purpose: Generate baseline senators-rankings.json from local legislators-current.json
// Filters for current Senators (119th Congress), initializes updated schema with unified becameLaw

const fs = require('fs');
const path = require('path');

const ROSTER_PATH = path.join(__dirname, '..', 'public', 'legislators-current.json');
const OUT_PATH = path.join(__dirname, '..', 'public', 'senators-rankings.json');

(async () => {
  // Load local roster
  let roster;
  try {
    roster = JSON.parse(fs.readFileSync(ROSTER_PATH, 'utf-8'));
  } catch (err) {
    console.error(`Failed to read ${ROSTER_PATH}: ${err.message}`);
    process.exit(1);
  }

  // Filter current Senators (term end in future) and seed schema exactly as specified
  const sens = roster
    .filter(r => {
      const t = r.terms?.at(-1);
      return t?.type === 'sen' && t?.end && new Date(t.end) > new Date();
    })
    .map(sen => {
      const lastTerm = sen.terms.at(-1);
      return {
        bioguideId: sen.id?.bioguide || null,
        name: `${sen.name?.first || ''} ${sen.name?.last || ''}`.trim(),
        state: lastTerm?.state || 'Unknown',
        district: 'At-Large',
        party: lastTerm?.party || 'Unknown',
        office: 'Senator',
        congressgovId: sen.id?.bioguide || null, // Direct Bioguide ID for API calls
        // Votes
        yeaVotes: 0,
        nayVotes: 0,
        missedVotes: 0,
        totalVotes: 0,
        participationPct: 0,
        missedVotePct: 0,
        // Legislation (updated schema - unified becameLaw)
        sponsoredBills: 0,
        cosponsoredBills: 0,
        becameLaw: 0, // Unified combined enacted/became-law count
        // Committees
        committees: [],
        // Scores
        rawScore: 0,
        score: 0,
        scoreNormalized: 0
      };
    });

  // Quick validation log
  console.log(`Found ${sens.length} current Senators in local roster`);
  console.log(
    'Sample with IDs (first 3):',
    sens.slice(0, 3).map(s => ({
      name: s.name,
      state: s.state,
      bioguideId: s.bioguideId,
      congressgovId: s.congressgovId
    }))
  );

  fs.writeFileSync(OUT_PATH, JSON.stringify(sens, null, 2));
  console.log(`Bootstrapped senators-rankings.json with ${sens.length} current Senators`);
})();
