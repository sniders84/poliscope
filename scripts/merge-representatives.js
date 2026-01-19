// scripts/merge-representatives.js
// Purpose: Merge bootstrap, legislation, committees, votes into representatives-rankings.json
// Amendment fields removed

const fs = require('fs');
const path = require('path');

const bootstrapPath = path.join(__dirname, '../public/representatives-rankings.json');
const legislationPath = path.join(__dirname, '../public/legislation-representatives.json');
const committeesPath = path.join(__dirname, '../public/committees-representatives.json');
const votesPath = path.join(__dirname, '../public/votes-representatives.json');

const reps = JSON.parse(fs.readFileSync(bootstrapPath, 'utf-8'));
const legislation = JSON.parse(fs.readFileSync(legislationPath, 'utf-8'));
const committees = JSON.parse(fs.readFileSync(committeesPath, 'utf-8'));
const votes = JSON.parse(fs.readFileSync(votesPath, 'utf-8'));

function findLegislation(bioguideId) {
  return legislation.find(l => l.bioguideId === bioguideId);
}
function findCommittees(bioguideId) {
  return committees.find(c => c.bioguideId === bioguideId);
}
function findVotes(bioguideId) {
  return votes.find(v => v.bioguideId === bioguideId);
}

for (const rep of reps) {
  const leg = findLegislation(rep.bioguideId);
  if (leg) {
    rep.sponsoredBills = leg.sponsoredBills;
    rep.cosponsoredBills = leg.cosponsoredBills;
    rep.becameLawBills = leg.becameLawBills;
    rep.becameLawCosponsoredBills = leg.becameLawCosponsoredBills;
  }

  const com = findCommittees(rep.bioguideId);
  if (com) {
    rep.committees = com.committees;
  }

  const v = findVotes(rep.bioguideId);
  if (v) {
    rep.yeaVotes = v.yeaVotes;
    rep.nayVotes = v.nayVotes;
    rep.missedVotes = v.missedVotes;
    rep.totalVotes = v.totalVotes;
    rep.participationPct = v.participationPct;
    rep.missedVotePct = v.missedVotePct;
  }
}

fs.writeFileSync(bootstrapPath, JSON.stringify(reps, null, 2));
console.log(`Merge complete: ${reps.length} representatives updated`);
