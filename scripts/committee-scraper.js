const fs = require('fs');
const path = require('path');

const RANKINGS_PATH = path.join(__dirname, '../public/senators-rankings.json');
const COMMITTEE_SOURCE = path.join(__dirname, '../public/senators-committee-membership-current.json');

function run() {
  console.log('Committee aggregator: top-level only from senators-committee-membership-current.json');

  let rankings, committeeData;
  try {
    rankings = JSON.parse(fs.readFileSync(RANKINGS_PATH, 'utf8'));
    committeeData = JSON.parse(fs.readFileSync(COMMITTEE_SOURCE, 'utf8'));
  } catch (err) {
    console.error('Load error:', err.message);
    return;
  }

  const byId = new Map(rankings.map(sen => [sen.bioguideId, sen]));

  const byBioguide = {};

  Object.entries(committeeData).forEach(([committeeCode, members]) => {
    // Skip if committeeCode looks like a subcommittee (e.g., starts with 'SS' subcode or has 'Subcommittee')
    if (committeeCode.includes('Subcommittee') || committeeCode.length > 4) {
      console.log(`Skipping possible subcommittee: ${committeeCode}`);
      return;
    }

    members.forEach(member => {
      const bioguide = member.bioguide;
      if (!bioguide) return;

      if (!byBioguide[bioguide]) byBioguide[bioguide] = { committees: [] };

      // Deduplicate by committeeCode
      if (byBioguide[bioguide].committees.some(c => c.committee === committeeCode)) return;

      let role = member.title || 'Member';
      if (member.rank === 1 || role.toLowerCase().includes('chair')) role = 'Chairman';
      if (member.rank === 2 || role.toLowerCase().includes('ranking')) role = 'Ranking Member';

      byBioguide[bioguide].committees.push({
        committee: committeeCode,
        role,
        rank: member.rank || null,
        party: member.party || null
      });
    });
  });

  let updatedCount = 0;
  rankings.forEach(sen => {
    const agg = byBioguide[sen.bioguideId];
    if (agg && agg.committees.length > 0) {
      sen.committees = agg.committees;
      updatedCount++;
      console.log(`Updated ${sen.name} with ${agg.committees.length} top-level committees (roles: ${agg.committees.map(c => c.role).join(', ')})`);
    }
  });

  fs.writeFileSync(RANKINGS_PATH, JSON.stringify(rankings, null, 2));
  console.log(`Committees updated for ${updatedCount} senators`);
}

run();
