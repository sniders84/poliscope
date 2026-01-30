// scripts/merge-senators.js
// Enriches senators-rankings.json in-place, pulls photos from senators.json
// Cleans out unwanted amendment fields

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const DIR = path.join(__dirname, '..', 'public');

const paths = {
  rankings:    path.join(DIR, 'senators-rankings.json'),
  info:        path.join(DIR, 'senators.json'),
  legislation: path.join(DIR, 'legislation-senators.json'),
  committees:  path.join(DIR, 'senators-committee-membership-current.json'),
  votes:       path.join(DIR, 'senators-votes.json'),
  misconduct:  path.join(DIR, 'misconduct.yaml'),
  streaks:     path.join(DIR, 'senators-streaks.json'),
};

function loadJson(p, def = []) {
  if (!fs.existsSync(p)) {
    console.log(`No ${path.basename(p)} → empty`);
    return def;
  }
  try {
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    console.log(`Loaded ${path.basename(p)} (${Array.isArray(data) ? data.length : 'obj'})`);
    return data;
  } catch (e) {
    console.error(`Parse fail ${path.basename(p)}: ${e.message}`);
    return def;
  }
}

function loadYaml(p) {
  if (!fs.existsSync(p)) return [];
  try {
    const data = yaml.load(fs.readFileSync(p, 'utf8')) || [];
    console.log(`misconduct: ${Array.isArray(data) ? data.length : 0} entries`);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.warn(`misconduct parse fail: ${e}`);
    return [];
  }
}

// Load base
let rankings = loadJson(paths.rankings, []);
const info = loadJson(paths.info, []);
const legislation = loadJson(paths.legislation, []);
const committees = loadJson(paths.committees, []);
const votes = loadJson(paths.votes, []);
const misconduct = loadYaml(paths.misconduct);
const streaks = loadJson(paths.streaks, []);

// Maps
const infoMap = new Map(info.map(i => [i.bioguideId, i]));
const legMap = new Map(legislation.map(l => [l.bioguideId, l]));
const commMap = new Map(committees.map(c => [c.bioguide, c]));
const voteMap = new Map(votes.map(v => [v.bioguideId, v]));
const mcMap = new Map(misconduct.map(m => [m.bioguideId, m]));
const streakMap = new Map(streaks.map(s => [s.bioguideId, s]));

// Enrich
rankings = rankings.map(sen => {
  const id = sen.bioguideId;
  if (!id) return sen;

  const base = infoMap.get(id);
  if (base) {
    sen.name = base.name ?? sen.name;
    sen.state = base.state ?? sen.state;
    sen.party = base.party ?? sen.party;
    sen.slug = base.slug ?? sen.slug;
    sen.govtrackId = base.govtrackId ?? sen.govtrackId;
    sen.photo = base.photo || sen.photo || null;
  }

  const l = legMap.get(id);
  if (l) {
    sen.sponsoredBills = l.sponsoredBills ?? sen.sponsoredBills ?? 0;
    sen.cosponsoredBills = l.cosponsoredBills ?? sen.cosponsoredBills ?? 0;
    sen.becameLawBills = l.becameLawBills ?? sen.becameLawBills ?? 0;
    sen.becameLawCosponsoredBills = l.becameLawCosponsoredBills ?? sen.becameLawCosponsoredBills ?? 0;
  }

  const c = commMap.get(id);
  if (c?.committees) sen.committees = c.committees;

  const v = voteMap.get(id)?.votes;
  if (v) {
    Object.assign(sen, {
      yeaVotes: v.yeaVotes ?? 0,
      nayVotes: v.nayVotes ?? 0,
      missedVotes: v.missedVotes ?? 0,
      totalVotes: v.totalVotes ?? 0,
      participationPct: v.participationPct ?? 0,
      missedVotePct: v.missedVotePct ?? 0,
    });
  }

  const mc = mcMap.get(id);
  if (mc) {
    sen.misconductCount = mc.misconductCount ?? 0;
    sen.misconductTags = Array.isArray(mc.misconductTags) ? mc.misconductTags : [];
  }

  const str = streakMap.get(id);
  if (str) {
    sen.streaks = str.streaks ?? sen.streaks ?? { activity: 0, voting: 0, leader: 0 };
    sen.streak = str.streak ?? sen.streak ?? 0;
  }

  // Metrics snapshot
  sen.metrics = sen.metrics || { lastTotals: {} };
  sen.metrics.lastTotals = {
    sponsoredBills: sen.sponsoredBills ?? 0,
    cosponsoredBills: sen.cosponsoredBills ?? 0,
    yeaVotes: sen.yeaVotes ?? 0,
    nayVotes: sen.nayVotes ?? 0,
    missedVotes: sen.missedVotes ?? 0,
    totalVotes: sen.totalVotes ?? 0,
  };

  // Strip unwanted amendment fields if present
  delete sen.sponsoredAmendments;
  delete sen.cosponsoredAmendments;
  delete sen.becameLawAmendments;
  delete sen.becameLawCosponsoredAmendments;

  sen.lastUpdated = new Date().toISOString();
  return sen;
});

fs.writeFileSync(paths.rankings, JSON.stringify(rankings, null, 2));
console.log(`Senate merge: ${rankings.length} senators updated (photos forced from senators.json)`);
