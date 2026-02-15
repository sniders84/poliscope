// scripts/merge-senators.js

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
const rankings = loadJSON("public/senators-rankings.json");
const legislation = loadJSON("public/senators-legislation.json");
const votes = loadJSON("public/senators-votes.json");
const streaks = loadJSON("public/senators-streaks.json");

// Misconduct YAML
const misconduct = yaml.load(fs.readFileSync("public/misconduct.yaml", "utf8")) || {};

// senators.json (metadata: photos, links, etc.)
const senatorsMeta = loadJSON("public/senators.json");

// Build slug → metadata map
const metaMap = new Map();
senatorsMeta.forEach(s => {
  metaMap.set(s.slug, {
    photo: s.photo,
    party: s.party,
    state: s.state,
    office: s.office,
    ballotpediaLink: s.ballotpediaLink,
    govtrackLink: s.govtrackLink,
    contact: s.contact,
    social: s.social
  });
});

// Merge everything into rankings
rankings.forEach(r => {
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

  // Metadata (photos, links, etc.)
  if (metaMap.has(r.slug)) {
    const info = metaMap.get(r.slug);
    r.photo = info.photo;
    r.party = info.party;
    r.state = info.state;
    r.office = info.office;
    r.ballotpediaLink = info.ballotpediaLink;
    r.govtrackLink = info.govtrackLink;
    r.contact = info.contact;
    r.social = info.social;
  } else {
    console.warn(`No senators.json match for slug: ${r.slug}`);
  }
});

// Write out enriched rankings
fs.writeFileSync("public/senators-rankings.json", JSON.stringify(rankings, null, 2));
console.log("senators-rankings.json updated with legislation, votes, misconduct, streaks, and metadata via slug matching.");
