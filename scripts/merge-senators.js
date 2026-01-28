// scripts/merge-senators.js

const fs = require("fs");

// Load baseline info (with photos, names, etc.)
const senatorsInfo = JSON.parse(
  fs.readFileSync("public/senators.json", "utf8")
);

// Load legislation, committees, votes, misconduct
const legislation = JSON.parse(
  fs.readFileSync("public/legislation-senators.json", "utf8")
);
const committees = JSON.parse(
  fs.readFileSync("public/senators-committees.json", "utf8")
);
const votes = JSON.parse(
  fs.readFileSync("public/senators-votes.json", "utf8")
);
const misconduct = JSON.parse(
  fs.readFileSync("public/misconduct.yaml", "utf8")
); // assuming YAML parsed earlier in pipeline

// Helper: find senator info by bioguideId
function findSenatorInfo(bioguideId) {
  return senatorsInfo.find((s) => s.bioguideId === bioguideId);
}

function findLegislation(bioguideId) {
  return legislation.find((l) => l.bioguideId === bioguideId);
}

function findCommittees(bioguideId) {
  return committees.find((c) => c.bioguideId === bioguideId);
}

function findVotes(bioguideId) {
  return votes.find((v) => v.bioguideId === bioguideId);
}

function findMisconduct(bioguideId) {
  return misconduct.find((m) => m.bioguideId === bioguideId);
}

// Merge everything into rankings
const rankings = senatorsInfo.map((info) => {
  const bioguideId = info.bioguideId;

  const record = {
    slug: info.slug,
    bioguideId,
    govtrackId: info.govtrackId,
    name: info.name,
    state: info.state,
    district: info.district,
    party: info.party,
    office: info.office,
    // ✅ Preserve photo from baseline info
    photo: info.photo,

    sponsoredBills: 0,
    cosponsoredBills: 0,
    becameLawBills: 0,
    becameLawCosponsoredBills: 0,
    committees: [],
    misconductCount: 0,
    misconductTags: [],
    yeaVotes: 0,
    nayVotes: 0,
    missedVotes: 0,
    totalVotes: 0,
    participationPct: 0,
    missedVotePct: 0,
    streaks: { activity: 0, voting: 0, leader: 0 },
    metrics: { lastTotals: {} },
    streak: 0,
    powerScore: 0,
    lastUpdated: new Date().toISOString(),
  };

  // Merge legislation
  const leg = findLegislation(bioguideId);
  if (leg) {
    record.sponsoredBills = leg.sponsoredBills || 0;
    record.cosponsoredBills = leg.cosponsoredBills || 0;
    record.becameLawBills = leg.becameLawSponsored || 0;
    record.becameLawCosponsoredBills = leg.becameLawCosponsored || 0;
  }

  // Merge committees
  const comm = findCommittees(bioguideId);
  if (comm) {
    record.committees = comm.committees || [];
  }

  // Merge votes
  const v = findVotes(bioguideId);
  if (v) {
    record.yeaVotes = v.yeaVotes || 0;
    record.nayVotes = v.nayVotes || 0;
    record.missedVotes = v.missedVotes || 0;
    record.totalVotes = v.totalVotes || 0;
    record.participationPct = v.participationPct || 0;
    record.missedVotePct = v.missedVotePct || 0;
  }

  // Merge misconduct
  const m = findMisconduct(bioguideId);
  if (m) {
    record.misconductCount = m.count || 0;
    record.misconductTags = m.tags || [];
  }

  return record;
});

// Write merged rankings
fs.writeFileSync(
  "public/senators-rankings.json",
  JSON.stringify(rankings, null, 2)
);

console.log(`Finished merge: ${rankings.length} senators updated in senators-rankings.json`);
