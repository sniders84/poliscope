// scripts/merge-representatives.js
//
// Purpose: Consolidate House data sources into representatives-rankings.json
// Output: public/representatives-rankings.json

const fs = require('fs');
const path = require('path');

function loadJson(p) {
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf-8')) : [];
}

const rankingsPath = path.join(__dirname, '../public/representatives-rankings.json');
const legislationPath = path.join(__dirname, '../public/representatives-legislation.json');
const misconductPath = path.join(__dirname, '../public/misconduct-house.json');
const scoresPath = path.join(__dirname, '../public/representatives-scores.json');
const streaksPath = path.join(__dirname, '../public/representatives-streaks.json');

let reps = loadJson(rankingsPath);
const legislation = loadJson(legislationPath);
const misconduct = loadJson(misconductPath);
const scores = loadJson(scoresPath);
const streaks = loadJson(streaksPath);

const merged = reps.map(rep => {
  const bioguideId = rep.bioguideId || null;

  const legData = legislation.find(x => x.bioguideId === bioguideId) || {};
  const misconductData = misconduct.find(x => x.bioguideId === bioguideId) || {};
  const scoreData = scores.find(x => x.bioguideId === bioguideId) || {};
  const streakData = streaks.find(x => x.bioguideId === bioguideId) || {};

  return {
    ...rep,
    sponsoredBills: legData.sponsoredBills ?? rep.sponsoredBills ?? 0,
    cosponsoredBills: legData.cosponsoredBills ?? rep.cosponsoredBills ?? 0,
    becameLawBills: legData.becameLawBills ?? rep.becameLawBills ?? 0,
    becameLawCosponsoredBills: legData.becameLawCosponsoredBills ?? rep.becameLawCosponsoredBills ?? 0,
    misconductCount: misconductData.misconductCount ?? rep.misconductCount ?? 0,
    misconductTags: misconductData.misconductTags ?? rep.misconductTags ?? [],
    misconductTexts: misconductData.misconductTexts ?? rep.misconductTexts ?? [],
    misconductAllegations: misconductData.misconductAllegations ?? rep.misconductAllegations ?? [],
    misconductConsequences: misconductData.misconductConsequences ?? rep.misconductConsequences ?? [],
    score: scoreData.score ?? rep.score ?? 0,
    scoreNormalized: scoreData.scoreNormalized ?? rep.scoreNormalized ?? 0,
    streak: streakData.streak ?? rep.streak ?? 0,
    lastUpdated: new Date().toISOString()
  };
});

fs.writeFileSync(rankingsPath, JSON.stringify(merged, null, 2));
console.log(`Merged ${merged.length} House records into ${rankingsPath}`);
