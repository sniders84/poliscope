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

      // Only add if not duplicate (some members appear multiple times)
      const existing = byBioguide[bioguide].committees.find(c => c.committee === committeeCode);
      if (existing) return;

      let role = member.title || 'Member';
      if (member.rank === 1) role = 'Chairman';
      if (member.rank === 2) role = 'Ranking Member';

      byBioguide[bioguide].committees.push({
        committee: committeeCode,  // e.g., "SSAF"
        role,
        rank: member.rank,
        party: member.party
      });
    });
  });

  // Merge into rankings
  let updatedCount = 0;
  rankings.forEach(sen => {
    const agg = byBiog
