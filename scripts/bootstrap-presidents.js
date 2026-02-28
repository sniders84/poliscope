// scripts/bootstrap-presidents.js
// Build base presidents-rankings.json from presidents.json with the new simplified schema
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

// Read roster from /public
const ROSTER_PATH = path.join(ROOT, 'public', 'presidents.json');
// Output to /public
const RANKINGS_PATH = path.join(ROOT, 'public', 'presidents-rankings.json');

function loadPresidents() {
  const raw = fs.readFileSync(ROSTER_PATH, 'utf8');
  return JSON.parse(raw);
}

function buildEmptyScores() {
  return {
    crisisManagement: 0,
    domesticPolicy: 0,
    economicPolicy: 0,
    foreignPolicy: 0,
    judicialPolicy: 0,
    legislation: 0,
    misconduct: 0,
    powerScore: 0,
    eraNormalizedScore: 0,
    rank: null
  };
}

function buildEmptySummaries() {
  return {
    crisisManagement: "",
    domesticPolicy: "",
    economicPolicy: "",
    foreignPolicy: "",
    judicialPolicy: "",
    legislation: "",
    misconduct: ""
  };
}

function buildEmptyEvents() {
  return {
    crisisManagement: [],
    domesticPolicy: [],
    economicPolicy: [],
    foreignPolicy: [],
    judicialPolicy: [],
    legislation: [],
    misconduct: []
  };
}

function main() {
  const presidents = loadPresidents();
  // NEW: output is an object keyed by ID
  const rankings = {};
  presidents.forEach(p => {
    const id = p.presidentNumber;
    rankings[id] = {
      id,
      name: p.name,
      termStart: p.termStart,
      termEnd: p.termEnd,
      party: p.party,
      photo: p.photo || 'https://via.placeholder.com/150?text=No+Photo', // <-- ADDED: copy photo
      // NEW: simplified schema
      scores: buildEmptyScores(),
      summaries: buildEmptySummaries(),
      events: buildEmptyEvents()
    };
  });
  fs.writeFileSync(RANKINGS_PATH, JSON.stringify(rankings, null, 2), 'utf8');
  console.log(`bootstrap-presidents: wrote ${presidents.length} records to presidents-rankings.json`);
}

main();
