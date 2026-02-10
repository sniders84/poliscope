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
const committeesPath = path.join(__dirname, '../public/representatives-committees.json');
const misconductPath = path.join(__dirname, '../public/misconduct-house.json');
const scoresPath = path.join(__dirname, '../public/representatives-scores.json');
const streaksPath = path.join(__dirname, '../public/representatives-streaks.json');
const votesPath = path.join(__dirname, '../public/representatives-votes.json');
const houserepsPath = path.join(__dirname, '../public/housereps.json');

let reps = loadJson(rankingsPath);
const legislation = loadJson(legislationPath);
let committees = loadJson(committeesPath);
const misconduct = loadJson(misconductPath);
const scores = loadJson(scoresPath);
const streaks = loadJson(streaksPath);
const votes = loadJson(votesPath);
const housereps = loadJson(houserepsPath);

// Normalize committees: ensure it's always an array of { bioguideId, committees }
if (!Array.isArray(committees)) {
  committees = Object.values(committees).flatMap(c =>
    (c.members || []).map(m => ({
      bioguideId: (m.bioguide || m.bioguideId || m.id || '').toUpperCase(),
      committees: [{
        committeeCode: c.code,
        committeeName: c.name || c.code,
        role: m.title || 'Member',
        rank: m.rank ?? null,
        party: m.party || null
      }]
    }))
  );
}

const merged = reps.map(rep => {
  const bioguideId = rep.bioguideId || null;

  const legData = legislation.find(x => x.bioguideId === bioguideId) || {};
  const committeeData = committees.find(x => x.bioguideId === bioguideId) || {};
  const misconductData = misconduct.find(x => x.bioguideId === bioguideId) || {};
  const scoreData = scores.find(x => x.bioguideId === bioguideId) || {};
  const streakData = streaks.find(x => x.bioguideId === bioguideId) || {};
  const voteData = votes.find(x => x.bioguideId === bioguideId) || {};
  const houseData = housereps.find(x => x.bioguideId === bioguideId) || {};

  return {
    ...rep,
    // Legislation
    sponsoredBills: legData.sponsoredBills ?? 0,
    cosponsoredBills: legData.cosponsoredBills ?? 0,
    becameLawBills: legData.becameLawBills ?? 0,
    becameLawCosponsoredBills: legData.becameLawCosponsoredBills ?? 0,

    // Committees
    committees: committeeData.committees ?? [],

    // Misconduct
    misconductCount: misconductData.misconductCount ?? 0,
    misconductTags: misconductData.misconductTags ?? [],
    misconductTexts: misconductData.misconductTexts ?? [],
    misconductAllegations: misconductData.misconductAllegations ?? [],
    misconductConsequences: misconductData.misconductConsequences ?? [],

    // Scores
    score: scoreData.score ?? 0,
    scoreNormalized: scoreData.scoreNormalized ?? 0,

    // Streaks
    streak: streakData.streak ?? 0,

    // Votes
    yeaVotes: voteData.yeaVotes ?? 0,
    nayVotes: voteData.nayVotes ?? 0,
    missedVotes: voteData.missedVotes ?? 0,
    totalVotes: voteData.totalVotes ?? 0,
    participationPct: voteData.participationPct ?? 0,
    missedVotePct: voteData.missedVotePct ?? 0,

    // Photos + baseline info from housereps.json
    photoUrl: houseData.photo || null,
    firstName: houseData.firstName || rep.firstName,
    lastName: houseData.lastName || rep.lastName,
    party: houseData.party || rep.party,
    state: houseData.state || rep.state,
    district: houseData.district || rep.district,
    office: houseData.office || rep.office,

    lastUpdated: new Date().toISOString()
  };
});

fs.writeFileSync(rankingsPath, JSON.stringify(merged, null, 2));
console.log(`Merged ${merged.length} House records into ${rankingsPath}`);
