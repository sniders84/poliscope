/**
 * Merge script for senators-rankings.json
 *
 * Inputs:
 *   public/senators-legislation.json
 *   public/senators-committees.json
 *   public/senators-votes.json
 *
 * Output:
 *   public/senators-rankings.json
 *
 * Logic:
 *   - Keyed by bioguideId
 *   - Merge legislation tallies, committee memberships (with leadership flags), and vote stats
 *   - Ensure no nulls; missing senators get empty/default structures
 */

const fs = require('fs');
const path = require('path');

const LEGISLATION = path.join('public', 'senators-legislation.json');
const COMMITTEES = path.join('public', 'senators-committees.json');
const VOTES = path.join('public', 'senators-votes.json');
const OUTPUT = path.join('public', 'senators-rankings.json');

// Helpers
function loadJson(file) {
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

// Default schema block
function initSenator(bioguideId) {
  return {
    bioguideId,
    legislation: {
      sponsoredBills: 0,
      cosponsoredBills: 0,
      sponsoredBillBecameLaw: 0,
      cosponsoredBillBecameLaw: 0,

      sponsoredAmendment: 0,
      cosponsoredAmendment: 0,

      sponsoredResolution: 0,
      cosponsoredResolution: 0,

      sponsoredJointResolution: 0,
      cosponsoredJointResolution: 0,
      sponsoredJointResolutionBecameLaw: 0,
      cosponsoredJointResolutionBecameLaw: 0,

      sponsoredConcurrentResolution: 0,
      cosponsoredConcurrentResolution: 0,
    },
    committees: [],
    votes: {
      totalVotes: 0,
      missedVotes: 0,
      missedVotePct: 0
    }
  };
}

function run() {
  const legislation = loadJson(LEGISLATION);
  const committees = loadJson(COMMITTEES);
  const votes = loadJson(VOTES);

  const totals = new Map();

  // Merge legislation
  for (const l of legislation) {
    const id = l.bioguideId;
    if (!id) continue;
    if (!totals.has(id)) totals.set(id, initSenator(id));
    totals.get(id).legislation = { ...totals.get(id).legislation, ...l };
  }

  // Merge committees
  for (const c of committees) {
    const id = c.bioguideId;
    if (!id) continue;
    if (!totals.has(id)) totals.set(id, initSenator(id));
    totals.get(id).committees = c.committees || [];
  }

  // Merge votes
  for (const v of votes) {
    const id = v.bioguideId;
    if (!id) continue;
    if (!totals.has(id)) totals.set(id, initSenator(id));
    totals.get(id).votes = {
      totalVotes: v.totalVotes || 0,
      missedVotes: v.missedVotes || 0,
      missedVotePct: v.missedVotePct || 0
    };
  }

  // Final array
  const results = Array.from(totals.values());

  // Ensure public/ exists
  const publicDir = path.join('public');
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

  fs.writeFileSync(OUTPUT, JSON.stringify(results, null, 2));
  console.log(`Wrote ${OUTPUT} with ${results.length} senator entries.`);
}

run();
