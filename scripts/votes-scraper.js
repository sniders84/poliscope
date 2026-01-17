// scripts/votes-scraper.js
// Pull Senate roll call votes from GovTrack bulk data (119th Congress)
// Enriches senators-rankings.json seeded by bootstrap

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const RANKINGS_PATH = path.join(__dirname, '../public/senators-rankings.json');
// GovTrack bulk votes endpoint (Senate, 119th Congress)
const GOVTRACK_VOTES_URL = 'https://www.govtrack.us/api/v2/vote?congress=119&chamber=senate&limit=1000';

async function fetchAllVotes() {
  let votes = [];
  let nextUrl = GOVTRACK_VOTES_URL;

  while (nextUrl) {
    const res = await fetch(nextUrl);
    if (!res.ok) throw new Error(`GovTrack fetch failed: ${res.status}`);
    const data = await res.json();
    votes = votes.concat(data.objects);
    nextUrl = data.meta.next; // pagination
  }
  return votes;
}

async function scrapeSenateVotes() {
  console.log(`Fetching GovTrack Senate votes for 119th Congress...`);

  let rankings;
  try {
    rankings = JSON.parse(fs.readFileSync(RANKINGS_PATH, 'utf8'));
  } catch (err) {
    console.error('Failed to load senators-rankings.json:', err.message);
    return;
  }

  // Initialize tallies
  const tallies = {};
  rankings.forEach(s => {
    tallies[s.bioguideId] = { yea: 0, nay: 0, missed: 0 };
  });

  try {
    const votes = await fetchAllVotes();
    console.log(`Processing ${votes.length} Senate votes from GovTrack...`);

    for (const vote of votes) {
      const voters = vote.voters || {};
      for (const [bioguideId, record] of Object.entries(voters)) {
        if (!tallies[bioguideId]) continue;
        const cast = (record.vote || '').toLowerCase();
        if (cast === 'yea' || cast === 'yes') tallies[bioguideId].yea++;
        else if (cast === 'nay' || cast === 'no') tallies[bioguideId].nay++;
        else tallies[bioguideId].missed++;
      }
    }

    const totalVotes = votes.length;

    // Merge tallies back into rankings
    rankings.forEach(s => {
      const t = tallies[s.bioguideId] || { yea: 0, nay: 0, missed: 0 };
      s.yeaVotes = t.yea;
      s.nayVotes = t.nay;
      s.missedVotes = t.missed;
      s.totalVotes = totalVotes;
      s.participationPct =
        totalVotes > 0 ? ((t.yea + t.nay) / totalVotes * 100).toFixed(2) : '0.00';
      s.missedVotePct =
        totalVotes > 0 ? (t.missed / totalVotes * 100).toFixed(2) : '0.00';
    });

    fs.writeFileSync(RANKINGS_PATH, JSON.stringify(rankings, null, 2));
    console.log(`Senate votes updated for ${rankings.length} senators`);

  } catch (err) {
    console.error('GovTrack votes scrape error:', err.message);
  }
}

scrapeSenateVotes();
