/**
 * Merge Senators Data
 * - Starts with existing public/senators-rankings.json as BASE
 * - Merges legislation and votes using bioguideId (fallback to name)
 * - Skips committees (already handled by committee-scraper)
 * - Updates senators-rankings.json in place
 */
const fs = require('fs');
const path = require('path');

const RANKINGS_PATH = path.join(__dirname, '../public/senators-rankings.json');
const LEGISLATION_PATH = path.join('public', 'senators-legislation.json');
const VOTES_PATH = path.join('public', 'senators-votes.json');

function load(file) {
  if (!fs.existsSync(file)) {
    console.log(`No file found: ${file} - skipping merge for this source`);
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    console.error(`Failed to parse ${file}: ${err.message}`);
    return [];
  }
}

function run() {
  console.log('Merge script: consolidating into senators-rankings.json');

  // Load base rankings (this is the source of truth)
  let rankings = load(RANKINGS_PATH);
  if (rankings.length === 0) {
    console.error('No base rankings.json found - cannot merge');
    return;
  }

  // Map for quick lookup: bioguideId → senator object (reference)
  const byId = new Map();
  const byName = new Map(); // fallback
  rankings.forEach(sen => {
    if (sen.bioguideId) byId.set(sen.bioguideId, sen);
    byName.set(sen.name, sen);
  });

  // Load sources
  const legislation = load(LEGISLATION_PATH);
  const votes = load(VOTES_PATH);

  // Merge legislation
  let legMerged = 0;
  for (const l of legislation) {
    let sen = byId.get(l.bioguideId) || byName.get(l.name);
    if (sen) {
      Object.assign(sen, l); // overwrite/add legislation fields
      legMerged++;
      console.log(`Merged legislation for ${sen.name || l.bioguideId || l.name}`);
    }
  }

  // Merge votes
  let votesMerged = 0;
  for (const v of votes) {
    let sen = byId.get(v.bioguideId) || byName.get(v.name);
    if (sen) {
      sen.missedVotes = v.missedVotes || 0;
      sen.totalVotes = v.totalVotes || 0;
      // Calculate percentage if not present
      sen.missedVotePct = sen.totalVotes > 0 
        ? +((sen.missedVotes / sen.totalVotes) * 100).toFixed(2) 
        : 0;
      votesMerged++;
      console.log(`Merged votes for ${sen.name || v.bioguideId || v.name}: missed ${sen.missedVotes}/${sen.totalVotes}`);
    }
  }

  // Save back to the same file
  try {
    fs.writeFileSync(RANKINGS_PATH, JSON.stringify(rankings, null, 2));
    console.log(`Merge complete: ${rankings.length} senators total`);
    console.log(`- Legislation merged for ${legMerged} senators`);
    console.log(`- Votes merged for ${votesMerged} senators`);
  } catch (err) {
    console.error('Failed to write rankings.json:', err.message);
  }
}

run();
