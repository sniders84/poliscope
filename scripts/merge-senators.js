// scripts/merge-senators.js
// Purpose: Merge bootstrap, legislation, committees, votes into senators-rankings.json
// Amendment fields removed

const fs = require('fs');
const path = require('path');

const bootstrapPath = path.join(__dirname, '../public/senators-rankings.json');
const legislationPath = path.join(__dirname, '../public/legislation-senators.json');
const committeesPath = path.join(__dirname, '../public/committees-senators.json');
const votesPath = path.join(__dirname, '../public/votes-senators.json');

const senators = JSON.parse(fs.readFileSync(bootstrapPath, 'utf-8'));
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

for (const sen of senators) {
  const leg = findLegislation(sen.bioguideId);
  if (leg) {
    sen.sponsoredBills = leg.sponsoredBills;
    sen.cosponsoredBills = leg.cosponsoredBills;
    sen.becameLawBills = leg.becameLawBills;
    sen.becameLawCosponsoredBills = leg.becameLawCosponsoredBills;
  }

  const com = findCommittees(sen.bioguideId);
  if (com) {
    sen.committees = com.committees;
  }

  const v = findVotes(sen.bioguideId);
  if (v) {
    sen.yeaVotes = v.yeaVotes;
    sen.nayVotes = v.nayVotes;
    sen.missedVotes = v.missedVotes;
    sen.totalVotes = v.totalVotes;
    sen.participationPct = v.participationPct;
    sen.missedVotePct = v.missedVotePct;
  }
}

fs.writeFileSync(bootstrapPath, JSON.stringify(senators, null, 2));
console.log(`Merge complete: ${senators.length} senators updated`);
