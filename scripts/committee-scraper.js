// scripts/committee-senators-scraper.js
// Purpose: Merge Senate committee memberships (with leadership flags) into senators-rankings.json
// Counts only top-level committees, preserves leadership titles, adds full committee names,
// and enforces schema consistency.

const fs = require('fs');
const path = require('path');

const RANKINGS_PATH = path.join(__dirname, '../public/senators-rankings.json');
const COMMITTEE_SOURCE = path.join(__dirname, '../public/senators-committee-membership-current.json');

// Full mapping: Senate committee code → human-readable name
const codeToName = {
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
  SLIA: 'Indian Affairs',
  SLIN: 'Intelligence',
  SLET: 'Ethics',
  SRES: 'Aging (Special)',
  JCSE: 'Economic',
  JSEC: 'Taxation',
  JSLC: 'Library of Congress',
  JSPW: 'Printing',
  SPAG: 'Agriculture (Joint)',
  SSEG: 'Energy (Joint)',
  SSNR: 'Natural Resources (Joint)',
  SSIS: 'Intelligence (Select)',
};

function ensureSchema(sen) {
  // Votes
  sen.yeaVotes ??= 0;
  sen.nayVotes ??= 0;
  sen.missedVotes ??= 0;
  sen.totalVotes ??= 0;
  sen.participationPct ??= 0;
  sen.missedVotePct ??= 0;

  // Legislation
  sen.sponsoredBills ??= 0;
  sen.cosponsoredBills ??= 0;
  sen.sponsoredAmendments ??= 0;
  sen.cosponsoredAmendments ??= 0;
  sen.becameLawBills ??= 0;
  sen.becameLawCosponsoredBills ??= 0;
  sen.becameLawAmendments ??= 0;
  sen.becameLawCosponsoredAmendments ??= 0;

  // Committees
  sen.committees = Array.isArray(sen.committees) ? sen.committees : [];

  // Scores
  sen.rawScore ??= 0;
  sen.score ??= 0;
  sen.scoreNormalized ??= 0;

  return sen;
}

function run() {
  console.log('Committee aggregator: top-level only + full names + robust matching');

  let rankings, committeeData;
  try {
    rankings = JSON.parse(fs.readFileSync(RANKINGS_PATH, 'utf8')).map(ensureSchema);
    committeeData = JSON.parse(fs.readFileSync(COMMITTEE_SOURCE, 'utf8'));
  } catch (err) {
    console.error('Load error:', err.message);
    return;
  }

  const byBioguide = {};

  Object.entries(committeeData).forEach(([committeeCode, members]) => {
    if (committeeCode.includes('Subcommittee') || committeeCode.length > 4 || !codeToName[committeeCode]) {
      console.log(`Skipping non-top-level or unknown: ${committeeCode}`);
      return;
    }

    members.forEach(member => {
      const bioguide = member.bioguide;
      const name = (member.name || '').toLowerCase();
      const key = bioguide || name;
      if (!key) return;

      if (!byBioguide[key]) byBioguide[key] = { committees: [] };

      if (byBioguide[key].committees.some(c => c.committeeCode === committeeCode)) return;

      let role = member.title || 'Member';
      if (member.rank === 1 || role.toLowerCase().includes('chair')) role = 'Chair';
      if (member.rank === 2 || role.toLowerCase().includes('ranking')) role = 'Ranking Member';

      byBioguide[key].committees.push({
        committeeCode,
        committeeName: codeToName[committeeCode] || committeeCode,
        role,
        rank: member.rank ?? null,
        party: member.party || null
      });
    });
  });

  let updatedCount = 0;
  let unmatched = [];
  rankings.forEach(sen => {
    const agg = byBioguide[sen.bioguideId] || byBioguide[sen.name.toLowerCase()];
    sen.committees = agg ? agg.committees : [];
    if (agg && agg.committees.length > 0) updatedCount++;
    else unmatched.push(sen.name);
  });

  try {
    fs.writeFileSync(RANKINGS_PATH, JSON.stringify(rankings, null, 2));
    console.log(`Committees updated for ${updatedCount} senators (with robust matching)`);
    if (unmatched.length > 0) console.log(`Unmatched: ${unmatched.join(', ')}`);
  } catch (err) {
    console.error('Write error:', err.message);
  }
}

run();
