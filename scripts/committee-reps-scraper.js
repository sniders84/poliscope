/**
 * Committee Aggregator (House version)
 * - Loads public/reps-committee-membership-current.json
 * - Counts only top-level committees (ignores subcommittees)
 * - Preserves leadership titles ("Chairman", "Ranking Member") for scoring
 * - Adds full committee names
 * - Robust matching: bioguide ID + name fallback
 * - Updates representatives-rankings.json directly
 */
const fs = require('fs');
const path = require('path');

const RANKINGS_PATH = path.join(__dirname, '../public/representatives-rankings.json');
const COMMITTEE_SOURCE = path.join(__dirname, '../public/reps-committee-membership-current.json');

// Full mapping: House committee code → human-readable name
const codeToName = {
  HSAG: 'Agriculture',
  HSAP: 'Appropriations',
  HSAS: 'Armed Services',
  HSBK: 'Financial Services',
  HSBU: 'Budget',
  HSCO: 'Commerce',
  HSFA: 'Foreign Affairs',
  HSIF: 'Energy and Commerce',
  HSJU: 'Judiciary',
  HSHA: 'House Administration',
  HSIG: 'Intelligence (Permanent Select)',
  HSII: 'Natural Resources',
  HSGO: 'Oversight and Accountability',
  HSPW: 'Transportation and Infrastructure',
  HSRU: 'Rules',
  HSSM: 'Small Business',
  HSSO: 'Science, Space, and Technology',
  HSSY: 'Ways and Means',
  HSVA: 'Veterans\' Affairs',
  HSBA: 'Education and the Workforce',
  HSLA: 'Ethics',
  HSCS: 'Homeland Security',
  HSMA: 'Modernization',
  JCSE: 'Economic (Joint)',
  JSEC: 'Taxation (Joint)',
  JSLC: 'Library of Congress (Joint)',
  JSPW: 'Printing (Joint)',
};

function run() {
  console.log('House Committee aggregator: top-level only + full names + robust matching');

  let rankings, committeeData;
  try {
    rankings = JSON.parse(fs.readFileSync(RANKINGS_PATH, 'utf8'));
    committeeData = JSON.parse(fs.readFileSync(COMMITTEE_SOURCE, 'utf8'));
  } catch (err) {
    console.error('Load error:', err.message);
    return;
  }

  // Maps for matching
  const byId = new Map(rankings.map(rep => [rep.bioguideId, rep]));
  const byName = new Map(rankings.map(rep => [rep.name.toLowerCase(), rep]));

  const byBioguide = {};

  Object.entries(committeeData).forEach(([committeeCode, members]) => {
    if (committeeCode.includes('Subcommittee') || committeeCode.length > 4 || !codeToName[committeeCode]) {
      console.log(`Skipping non-top-level or unknown: ${committeeCode}`);
      return;
    }

    members.forEach(member => {
      const bioguide = member.bioguide;
      const name = member.name.toLowerCase();
      const key = bioguide || name;
      if (!key) return;

      if (!byBioguide[key]) byBioguide[key] = { committees: [] };

      if (byBioguide[key].committees.some(c => c.committee === committeeCode)) return;

      let role = member.title || 'Member';
      if (member.rank === 1 || role.toLowerCase().includes('chair')) role = 'Chairman';
      if (member.rank === 2 || role.toLowerCase().includes('ranking')) role = 'Ranking Member';

      byBioguide[key].committees.push({
        committee: committeeCode,
        committeeName: codeToName[committeeCode] || committeeCode,
        role,
        rank: member.rank || null,
        party: member.party || null
      });
    });
  });

  let updatedCount = 0;
  let unmatched = [];
  rankings.forEach(rep => {
    let agg = byBioguide[rep.bioguideId] || byBioguide[rep.name.toLowerCase()];
    rep.committees = agg ? agg.committees : [];
    if (agg && agg.committees.length > 0) updatedCount++;
    else unmatched.push(rep.name);
  });

  try {
    fs.writeFileSync(RANKINGS_PATH, JSON.stringify(rankings, null, 2));
    console.log(`Committees updated for ${updatedCount} representatives (with robust matching)`);
    if (unmatched.length > 0) console.log(`Unmatched: ${unmatched.join(', ')}`);
  } catch (err) {
    console.error('Write error:', err.message);
  }
}

run();
