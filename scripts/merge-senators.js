// scripts/merge-representatives.js

const fs = require("fs");
const yaml = require("js-yaml");

// Safe JSON loader
function loadJSON(path) {
  try {
    return JSON.parse(fs.readFileSync(path, "utf8"));
  } catch (e) {
    console.warn(`Warning: could not load ${path}, defaulting to []`);
    return [];
  }
}

// Load all input files (FIXED PATHS)
const rankings = loadJSON("public/representatives-rankings.json");
const committees = loadJSON("public/representatives-committees.json");
const legislation = loadJSON("public/representatives-legislation.json");
const votes = loadJSON("public/representatives-votes.json");
const streaks = loadJSON("public/representatives-streaks.json");

// Misconduct YAML (already correct)
const misconduct = yaml.load(fs.readFileSync("public/misconduct.yaml", "utf8")) || {};

// housereps.json (already correct)
const housereps = loadJSON("public/housereps.json");

// Build slug → info map from housereps.json
const repMap = new Map();
housereps.forEach(rep => {
  repMap.set(rep.slug, {
    photo: rep.photo,
    office: rep.office,
    party: rep.party,
    state: rep.state,
    ballotpediaLink: rep.ballotpediaLink,
    govtrackLink: rep.govtrackLink,
    contact: rep.contact,
    social: rep.social
  });
});

// Merge everything into rankings
rankings.forEach(r => {
  // Committees
  const c = committees.find(x => x.slug === r.slug);
  if (c) r.committees = c.committees;

  // Legislation
  const l = legislation.find(x => x.slug === r.slug);
  if (l) r.legislation = l.legislation;

  // Votes
  const v = votes.find(x => x.bioguideId === r.bioguideId);
  if (v && v.votes) {
    r.yeaVotes = v.votes.yeaVotes;
    r.nayVotes = v.votes.nayVotes;
    r.missedVotes = v.votes.missedVotes;
    r.totalVotes = v.votes.totalVotes;
    r.participationPct = v.votes.participationPct;
    r.missedVotePct = v.votes.missedVotePct;
  }

  // Misconduct
  if (misconduct[r.slug]) {
    r.misconduct = misconduct[r.slug];
  }

  // Streaks
  const s = streaks.find(x => x.slug === r.slug);
  if (s) r.streak = s.streak;

  // Photos + metadata from housereps.json
  if (repMap.has(r.slug)) {
    const info = repMap.get(r.slug);
    r.photo = info.photo;
    r.office = info.office;
    r.party = info.party;
    r.state = info.state;
    r.ballotpediaLink = info.ballotpediaLink;
    r.govtrackLink = info.govtrackLink;
    r.contact = info.contact;
    r.social = info.social;
  } else {
    console.warn(`No housereps.json match for slug: ${r.slug}`);
  }
});

// Write out enriched rankings (FIXED PATH)
fs.writeFileSync("public/representatives-rankings.json", JSON.stringify(rankings, null, 2));
console.log("representatives-rankings.json updated with committees, legislation, votes, misconduct, streaks, and photos via slug matching.");
