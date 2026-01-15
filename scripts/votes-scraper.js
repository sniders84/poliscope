const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const RANKINGS_PATH = path.join(__dirname, '../public/senators-rankings.json');
const API_KEY = process.env.CONGRESS_API_KEY; // Your b2yaoc... key

async function getAllSenateVotes() {
  const baseUrl = 'https://api.congress.gov/v3/vote/119/senate';
  let allVotes = [];
  let offset = 0;
  const pageSize = 250;

  while (true) {
    const url = `${baseUrl}?api_key=${API_KEY}&pageSize=${pageSize}&offset=${offset}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();
    const votes = data.votes || [];
    allVotes = allVotes.concat(votes);
    if (votes.length < pageSize) break;
    offset += pageSize;
    console.log(`Fetched ${allVotes.length} votes...`);
  }
  console.log(`Total Senate votes: ${allVotes.length}`);
  return allVotes;
}

async function main() {
  console.log('Votes scraper: using Congress.gov API for 119th Senate votes');

  let rankings;
  try {
    rankings = JSON.parse(fs.readFileSync(RANKINGS_PATH, 'utf8'));
  } catch (err) {
    console.error('Failed to load rankings.json');
    return;
  }

  const bioguideToName = new Map(rankings.map(s => [s.bioguideId, s.name]));

  const allVotes = await getAllSenateVotes();

  const voteCounts = {
    yea: {},
    nay: {},
    notVoting: {}
  };
  rankings.forEach(s => {
    voteCounts.yea[s.name] = 0;
    voteCounts.nay[s.name] = 0;
    voteCounts.notVoting[s.name] = 0;
  });

  allVotes.forEach(vote => {
    if (!vote.memberPositions) return;
    vote.memberPositions.forEach(pos => {
      const bioguide = pos.member.bioguideId;
      const name = bioguideToName.get(bioguide);
      if (!name) return;

      const voteCast = pos.memberPosition.votePosition;
      if (voteCast === 'Yes') voteCounts.yea[name]++;
      if (voteCast === 'No') voteCounts.nay[name]++;
      if (voteCast === 'Not Voting') voteCounts.notVoting[name]++;
    });
  });

  rankings.forEach(sen => {
    const yea = voteCounts.yea[sen.name] || 0;
    const nay = voteCounts.nay[sen.name] || 0;
    const missed = voteCounts.notVoting[sen.name] || 0;
    sen.yeaVotes = yea;
    sen.nayVotes = nay;
    sen.missedVotes = missed;
    sen.totalVotes = allVotes.length;
    sen.missedVotePct = sen.totalVotes > 0 ? +((missed / sen.totalVotes) * 100).toFixed(2) : 0;
    sen.participationPct = sen.totalVotes > 0 ? +(((yea + nay) / sen.totalVotes) * 100).toFixed(2) : 0;
  });

  fs.writeFileSync(RANKINGS_PATH, JSON.stringify(rankings, null, 2));
  console.log(`Votes updated: ${allVotes.length} roll calls processed`);
}

main().catch(err => console.error('Votes failed:', err.message));
