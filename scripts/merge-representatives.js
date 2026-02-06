// scripts/merge-representatives.js
//
// Purpose: Merge House legislation, committees, votes, misconduct, scores, streaks
// Output: public/housereps.json

const fs = require('fs');
const path = require('path');

function loadJson(p) {
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf-8')) : [];
}

// Baseline file already contains photos, bios, links, etc.
const basePath = path.join(__dirname, '../public/housereps.json');
const legislationPath = path.join(__dirname, '../public/legislation-representatives.json');
const committeesPath = path.join(__dirname, '../public/committee-reps.json');
const votesPath = path.join(__dirname, '../public/votes-reps.json');
const misconductPath = path.join(__dirname, '../public/misconduct-house.json');
const scoresPath = path.join(__dirname, '../public/representatives-scores.json');
const streaksPath = path.join(__dirname, '../public/streaks-reps.json');

const base = loadJson(basePath);
const legislation = loadJson(legislationPath);
const committees = loadJson(committeesPath);
const votes = loadJson(votesPath);
const misconduct = loadJson(misconductPath);
const scores = loadJson(scoresPath);
const streaks = loadJson(streaksPath);

const merged = base.map(rep => {
  const bioguideId = rep.bioguideId || null;

  const legData = legislation.find(x => x.bioguideId === bioguideId) || {};
  const committeeData = committees.find(x => x.bioguideId === bioguideId) || {};
  const voteData = votes.find(x => x.bioguideId === bioguideId) || {};
  const misconductData = misconduct.find(x => x.bioguideId === bioguideId) || {};
  const scoreData = scores.find(x => x.bioguideId === bioguideId) || {};
  const streakData = streaks.find(x => x.bioguideId === bioguideId) || {};

  return {
    ...rep, // preserve photo, bio, office, links, etc.
    sponsoredBills: legData.sponsoredBills || 0,
    cosponsoredBills: legData.cosponsoredBills || 0,
    becameLawBills: legData.becameLawBills || 0,
    becameLawCosponsoredBills: legData.becameLawCosponsoredBills || 0,
    committees: committeeData.committees || [],
    votes: voteData.votes || [],
    misconduct: misconductData.misconduct || [],
    score: scoreData.score || 0,
    streak: streakData.streak || 0
  };
});

fs.writeFileSync(basePath, JSON.stringify(merged, null, 2));
console.log(`Updated ${merged.length} House records in ${basePath}`);
