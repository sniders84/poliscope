// merge-senators.js
// Combines legislation, votes, and committees into senators-rankings.json

const fs = require('fs');

// Load source files
const legislators = JSON.parse(fs.readFileSync('public/legislators-current.json', 'utf8'));
const legislation = JSON.parse(fs.readFileSync('public/senators-legislation.json', 'utf8'));
const votes = JSON.parse(fs.readFileSync('public/senators-votes.json', 'utf8'));
const committees = JSON.parse(fs.readFileSync('public/senators-committees.json', 'utf8'));

// Index by bioguideId
const byLegislation = new Map(legislation.map(l => [l.bioguideId, l]));
const byVotes = new Map(votes.map(v => [v.bioguideId, v]));
const byCommittees = new Map(committees.map(c => [c.bioguideId, c]));

const senators = legislators.filter(l => l.terms.some(t => t.type === 'sen'));

const results = [];

for (const s of senators) {
  const bioguideId = s.id.bioguide;
  const leg = byLegislation.get(bioguideId) || {};
  const vote = byVotes.get(bioguideId) || {};
  const comm = byCommittees.get(bioguideId) || {};

  results.push({
    name: s.name.official_full,
    state: s.terms[s.terms.length - 1].state,
    party: s.terms[s.terms.length - 1].party,
    office: 'Senator',
    bioguideId,

    // Legislation
    sponsoredBills: leg.sponsoredBills || 0,
    cosponsoredBills: leg.cosponsoredBills || 0,
    becameLawSponsoredBills: leg.becameLawSponsoredBills || 0,
    becameLawCosponsoredBills: leg.becameLawCosponsoredBills || 0,

    // Committees
    committees: comm.committees || [],
    committeeLeadership: comm.committeeLeadership || [],

    // Votes
    votesCast: vote.votesCast || 0,
    missedVotes: vote.missedVotes || 0,
    missedPct: vote.missedPct || 0,
  });
}

fs.writeFileSync('public/senators-rankings.json', JSON.stringify(results, null, 2));
console.log('Merged senators-rankings.json created! Legislative, committees, and votes unified by bioguideId.');
