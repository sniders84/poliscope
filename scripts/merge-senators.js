/**
 * Merge Senators Data
 * - Reads existing public/senators-rankings.json as BASE
 * - Merges legislation, committees, votes using bioguideId
 * - Updates senators-rankings.json in place (consolidates everything)
 * - Preserves original fields (state, party, photo, etc.)
 */
const fs = require('fs');
const path = require('path');

const RANKINGS_PATH = path.join(__dirname, '../public/senators-rankings.json');
const LEGISLATION_PATH = path.join('public', 'senators-legislation.json');
const COMMITTEES_PATH = path.join('public', 'senators-committees.json');
const VOTES_PATH = path.join('public', 'senators-votes.json');

function load(file) {
  if (!fs.existsSync(file)) {
    console.log(`No file found: ${file} - skipping`);
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
  console.log('Starting merge into senators-rankings.json...');

  // Load base (your original rankings data - state, party, slug, photo, etc.)
  let rankings = load(RANKINGS_PATH);
  if (rankings.length === 0) {
    console.error('No base rankings data - cannot merge.');
    return;
  }

  // Create map: bioguideId → senator object (reference to original)
  const byId = new Map(rankings.map(sen => [sen.bioguideId, sen]));

  // Load sources
  const legislation = load(LEGISLATION_PATH);
  const committees = load(COMMITTEES_PATH);
  const votes = load(VOTES_PATH);

  // Merge legislation (rename fields if needed, but use existing keys)
  for (const l of legislation) {
    const sen = byId.get(l.bioguideId);
    if (sen) {
      Object.assign(sen, l); // Merge all legislation fields
      console.log(`Merged legislation for ${sen.name}`);
    }
  }

  // Merge committees
  for (const c of committees) {
    const sen = byId.get(c.bioguideId);
    if (sen) {
      sen.committees = c.committees || [];
      console.log(`Merged committees for ${sen.name} (${sen.committees.length} committees)`);
    }
  }

  // Merge votes
  for (const v of votes) {
    const sen = byId.get(v.bioguideId || ''); // fallback if votes use name
    if (sen) {
      sen.missedVotes = v.missedVotes || 0;
      sen.totalVotes = v.totalVotes || 0;
      // Calculate pct if not present
      sen.missedVotePct = sen.totalVotes > 0 ? +((sen.missedVotes / sen.totalVotes) * 100).toFixed(2) : 0;
      console.log(`Merged votes for ${sen.name}: missed ${sen.missedVotes}/${sen.totalVotes}`);
    } else if (v.name) {
      // Fallback name match if bioguide missing
      const matched = rankings.find(s => s.name === v.name);
      if (matched) {
        matched.missedVotes = v.missedVotes || 0;
        matched.totalVotes = v.totalVotes || 0;
        matched.missedVotePct = matched.totalVotes > 0 ? +((matched.missedVotes / matched.totalVotes) * 100).toFixed(2) : 0;
        console.log(`Fallback name match: merged votes for ${matched.name}`);
      }
    }
  }

  // Save back to the same file
  try {
    fs.writeFileSync(RANKINGS_PATH, JSON.stringify(rankings, null, 2));
    console.log(`Updated senators-rankings.json with merged data for ${rankings.length} senators`);
  } catch (err) {
    console.error('Failed to write rankings.json:', err.message);
  }
}

run();
