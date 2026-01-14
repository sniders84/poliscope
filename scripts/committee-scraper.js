/**
 * Committee Aggregator (using your JSON file)
 * - Loads public/senators-committee-membership-current.json
 * - Counts only top-level committees (ignores subcommittees)
 * - Preserves leadership titles ("Chairman", "Ranking Member") for scoring
 * - Adds full committee names (e.g., "Agriculture, Nutrition, and Forestry" instead of "SSAF")
 * - Updates senators-rankings.json directly
 */
const fs = require('fs');
const path = require('path');

const RANKINGS_PATH = path.join(__dirname, '../public/senators-rankings.json');
const COMMITTEE_SOURCE = path.join(__dirname, '../public/senators-committee-membership-current.json');

// Full mapping: Senate committee code → human-readable name
const codeToName = {
  // Standing Committees
  SSAF: 'Agriculture, Nutrition, and Forestry',
  SSAP: 'Appropriations',
  SSAS: 'Armed Services',
  SSBK: 'Banking, Housing, and Urban Affairs',
  SSCV: 'Commerce, Science, and Transportation',
  SSCM: 'Energy and Natural Resources',
  SSEV: 'Environment and Public Works',
  SSFI: 'Finance',
  SSFR: 'Foreign Relations',
  SSGA: 'Homeland Security and Governmental Affairs',
  SSHR: 'Health, Education, Labor, and Pensions',
  SSJU: 'Judiciary',
  SSRA: 'Rules and Administration',
  SSSC: 'Small Business and Entrepreneurship',
  SSVA: 'Veterans\' Affairs',

  // Select/Intelligence/Special
  SLIA: 'Indian Affairs',
  SLIN: 'Intelligence',
  SLET: 'Ethics',
  SRES: 'Aging (Special)',

  // Joint Committees
  JCSE: 'Economic',
  JSEC: 'Taxation',
  JSLC: 'Library of Congress',
  JSPW: 'Printing',

  // Other common ones that appear in your JSON
  SPAG: 'Agriculture (Joint?)',
  SSEG: 'Energy (Joint?)',
  SSNR: 'Natural Resources (Joint?)',
  SSIS: 'Intelligence (Select)',
  SSCM33: 'Commerce Subcommittee (skip if sub)',
  // Add any missing codes from your JSON if needed
};

function run() {
  console.log('Committee aggregator: top-level only + full names from senators-committee-membership-current.json');

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
    // Skip obvious subcommittees
    if (committeeCode.includes('Subcommittee') || committeeCode.length > 4 || !codeToName[committeeCode]) {
      console.log(`Skipping non-top-level or unknown: ${committeeCode}`);
      return;
    }

    members.forEach(member => {
      const bioguide = member.bioguide;
      if (!bioguide) return;

      if (!byBioguide[bioguide]) byBioguide[bioguide] = { committees: [] };

      if (byBioguide[bioguide].committees.some(c => c.committee === committeeCode)) return;

      let role = member.title || 'Member';
      if (member.rank === 1 || role.toLowerCase().includes('chair')) role = 'Chairman';
      if (member.rank === 2 || role.toLowerCase().includes('ranking')) role = 'Ranking Member';

      byBioguide[bioguide].committees.push({
        committee: committeeCode,
        committeeName: codeToName[committeeCode] || committeeCode, // Full name here
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
      console.log(`Updated ${sen.name} with ${agg.committees.length} committees`);
      // Optional debug: log full names
      console.log(`  Committees: ${agg.committees.map(c => `${c.committeeName} (${c.role})`).join(', ')}`);
    }
  });

  try {
    fs.writeFileSync(RANKINGS_PATH, JSON.stringify(rankings, null, 2));
    console.log(`Committees updated for ${updatedCount} senators with full names`);
  } catch (err) {
    console.error('Write error:', err.message);
  }
}

run();
