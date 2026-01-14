/**
 * Committee Aggregator (using your existing JSON file)
 * - Loads public/senators-committee-membership-current.json
 * - Groups committees and leadership roles per senator (by bioguide)
 * - Updates senators-rankings.json directly with committees array
 */
const fs = require('fs');
const path = require('path');

const RANKINGS_PATH = path.join(__dirname, '../public/senators-rankings.json');
const COMMITTEE_SOURCE = path.join(__dirname, '../public/senators-committee-membership-current.json');

function run() {
  console.log('Committee aggregator: using senators-committee-membership-current.json');

  let rankings, committeeData;
  try {
    rankings = JSON.parse(fs.readFileSync(RANKINGS_PATH, 'utf8'));
    committeeData = JSON.parse(fs.readFileSync(COMMITTEE_SOURCE, 'utf8'));
  } catch (err) {
    console.error('Failed to load files:', err.message);
    return;
  }

  // Map bioguide -> senator object (reference)
  const byId = new Map(rankings.map(sen => [sen.bioguideId, sen]));

  // Aggregate committees per bioguide
  const byBioguide = {};

  Object.entries(committeeData).forEach(([committeeCode, members]) => {
    members.forEach(member => {
      const bioguide = member.bioguide;
      if (!bioguide) return;

      if (!byBioguide[bioguide]) {
        byBioguide[bioguide] = { committees: [] };
      }

      const entry = {
        committee: committeeCode,  // e.g., "SSAF" (can map to full name later if needed)
        role: member.title || (member.rank === 1 ? 'Chairman' : (member.rank === 2 ? 'Ranking Member' : 'Member')),
        rank: member.rank,
        party: member.party  // majority/minority
      };

      byBioguide[bioguide].committees.push(entry);
    });
  });

  // Merge into rankings
  let updatedCount = 0;
  rankings.forEach(sen => {
    const agg = byBioguide[sen.bioguideId];
    if (agg && agg.committees.length > 0) {
      sen.committees = agg.committees;
      updatedCount++;
      console.log(`Updated ${sen.name} (${sen.bioguideId}) with ${agg.committees.length} committees`);
    }
  });

  try {
    fs.writeFileSync(RANKINGS_PATH, JSON.stringify(rankings, null, 2));
    console.log(`Updated senators-rankings.json with committees for ${updatedCount} senators`);
  } catch (err) {
    console.error('Failed to write rankings.json:', err.message);
  }
}

run();
