// scripts/votes-reps-scraper.js
// Purpose: Scrape House votes for the 119th Congress via Congress.gov API

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const OUT_PATH = path.join(__dirname, '..', 'public', 'representatives-rankings.json');
const API_KEY = process.env.CONGRESS_API_KEY;
const BASE = 'https://api.congress.gov/v3';
const CONGRESS = 119;
const SESSIONS = [1, 2];

function ensureRepShape(rep) {
  rep.yeaVotes = rep.yeaVotes || 0;
  rep.nayVotes = rep.nayVotes || 0;
  rep.missedVotes = rep.missedVotes || 0;
  rep.totalVotes = rep.totalVotes || 0;
  rep.participationPct = rep.participationPct || 0;
  rep.missedVotePct = rep.missedVotePct || 0;
  return rep;
}

(async function main() {
  const reps = JSON.parse(fs.readFileSync(OUT_PATH, 'utf-8')).map(ensureRepShape);
  const repMap = new Map(reps.map(r => [r.bioguideId, r]));

  let processed = 0;
  let attached = 0;

  for (const session of SESSIONS) {
    const url = `${BASE}/house-vote/${CONGRESS}/${session}?api_key=${API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) continue;
    const data = await res.json();
    const votes = data.votes || [];

    for (const v of votes) {
