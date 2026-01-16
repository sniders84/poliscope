// scripts/merge-senators.js
// Purpose: Enforce schema consistency for senators-rankings.json (119th Congress)
// All scrapers enrich senators-rankings.json directly, so this step validates and normalizes

const fs = require('fs');
const path = require('path');

const RANKINGS_PATH = path.join(__dirname, '../public/senators-rankings.json');

function normalize(sen) {
  return {
    // Identity
    name: sen.name || '',
    bioguideId: sen.bioguideId || '',
    state: sen.state || '',
    district: sen.district || 'At-Large',
    party: sen.party || '',
    office: sen.office || 'Senator',

    // Legislation
    sponsoredBills: sen.sponsoredBills || 0,
    cosponsoredBills: sen.cosponsoredBills || 0,
    becameLawBills: sen.becameLawBills || 0,
    becameLawCosponsoredBills: sen.becameLawCosponsoredBills || 0,
    sponsoredAmendments: sen.sponsoredAmendments || 0,
    cosponsoredAmendments: sen.cosponsoredAmendments || 0,
    becameLawAmendments: sen.becameLawAmendments || 0,
    becameLawCosponsoredAmendments: sen.becameLawCosponsoredAmendments || 0,

    // Committees
    committees: Array.isArray(sen.committees) ? sen.committees : [],

    // Votes
    yeaVotes: Number(sen.yeaVotes) || 0,
    nayVotes: Number(sen.nayVotes) || 0,
    missedVotes: Number(sen.missedVotes) || 0,
    totalVotes: Number(sen.totalVotes) || 0,
    participationPct: sen.participationPct || 0,
    missedVotePct: sen.missedVotePct || 0,

    // Scores
    rawScore: sen.rawScore || 0,
    score: sen.score || 0,
    scoreNormalized: sen.scoreNormalized || 0
  };
}

async function main() {
  console.log('Merge script: consolidating into senators-rankings.json');

  let rankings;
  try {
    rankings = JSON.parse(fs.readFileSync(RANKINGS_PATH, 'utf8'));
  } catch (err) {
    console.error('Failed to load senators-rankings.json:', err.message);
    return;
  }

  // Remove duplicates by name
  const seen = new Set();
  rankings = rankings.filter(sen => {
    if (seen.has(sen.name)) {
      console.log(`Removing duplicate entry for: ${sen.name}`);
      return false;
    }
    seen.add(sen.name);
    return true;
  });

  console.log(`After deduplication: ${rankings.length} senators`);

  // Normalize schema
  const normalized = rankings.map(normalize);

  // Log some examples to verify votes are present
  const sampleSenators = ['Ted Cruz', 'Angela Alsobrooks', 'Tammy Baldwin', 'Ben Ray Luján', 'Peter Welch'];
  sampleSenators.forEach(name => {
    const sen = normalized.find(s => s.name === name);
    if (sen) {
      console.log(`After merge - ${name}: yea=${sen.yeaVotes}, nay=${sen.nayVotes}, missed=${sen.missedVotes}, total=${sen.totalVotes}, participation=${sen.participationPct}`);
    } else {
      console.log(`After merge - ${name}: not found`);
    }
  });

  try {
    fs.writeFileSync(RANKINGS_PATH, JSON.stringify(normalized, null, 2));
    console.log('Merge complete: ' + normalized.length + ' senators total');
    console.log('- Legislation merged for ' + normalized.filter(s => s.sponsoredBills !== undefined).length + ' senators');
    console.log('- Votes merged for ' + normalized.filter(s => s.totalVotes > 0).length + ' senators (with any vote data)');
  } catch (err) {
    console.error('Write error:', err.message);
  }
}

main().catch(err => console.error('Merge failed:', err.message));
