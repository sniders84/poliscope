/**
 * Committee Aggregator (using your JSON file)
 * - Loads public/senators-committee-membership-current.json
 * - Counts only top-level committees (ignores subcommittees)
 * - Preserves leadership titles ("Chairman", "Ranking Member") for scoring
 * - Updates senators-rankings.json directly
 */
const fs = require('fs');
const path = require('path');

const RANKINGS_PATH = path.join(__dirname, '../public/senators-rankings.json');
const COMMITTEE_SOURCE = path.join(__dirname, '../public/senators-committee-membership-current.json');

function run() {
  console.log('Committee aggregator: using senators-committee-membership-current.json (top-level only)');

  let rankings, committeeData;
  try {
    rankings = JSON.parse(fs.readFileSync(RANKINGS_PATH, 'utf8'));
    committeeData = JSON.parse(fs.readFileSync(COMMITTEE_SOURCE, 'utf8'));
  } catch (err) {
    console.error('Failed to load files:', err.message);
    return;
  }

  // Map bioguide -> senator reference
  const byId = new Map(rankings.map(sen => [sen.bioguideId, sen]));

  // Aggregate top-level committees per bioguide
  const byBioguide = {};

  Object.entries(committeeData).forEach(([committeeCode, members]) => {
    members.forEach(member => {
      const bioguide = member.bioguide;
      if (!bioguide) return;

      if (!byBioguide[bioguide]) {
        byBioguide[bioguide] = { committees: [] };
      }

      // Only add if not duplicate
      const existing = byBioguide[bioguide].committees.find(c => c.committee === committeeCode);
      if (existing) return;

      let role = member.title || 'Member';
      if (member.rank === 1 || member.title?.toLowerCase().includes('chair')) role = 'Chairman';
      if (member.rank === 2 || member.title?.toLowerCase().includes('ranking')) role = 'Ranking Member';

      byBioguide[bioguide].committees.push({
        committee: committeeCode,
        role,
        rank: member.rank,
        party: member.party
      });
    });
  });

  // Merge into rankings
  let updatedCount = 0;
  rankings.forEach(sen => {
    const agg = byBioguide[sen.bioguideId];
    if (agg && agg.committees.length > 0) {
      sen.committees = agg.committees;
      updatedCount++;
      console.log(`Updated ${sen.name} (${sen.bioguideId}) with ${agg.committees.length} top-level committees`);
    }
  });

  try {
    fs.writeFileSync(RANKINGS_PATH, JSON.stringify(rankings, null, 2));
    console.log(`Updated senators-rankings.json with top-level committees for ${updatedCount} senators`);
  } catch (err) {
    console.error('Failed to write rankings.json:', err.message);
  }
}

run();
