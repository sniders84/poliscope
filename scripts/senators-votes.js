// scripts/senators-votes.js — Use Congress.gov API for vote positions (more accurate)
const fs = require('fs');
const fetch = require('node-fetch');

const API_KEY = process.env.CONGRESS_API_KEY; // Add to GitHub secrets
const headers = API_KEY ? { 'X-Api-Key': API_KEY } : {};

async function getMissedVotesForSenator(bioguideId) {
  let missed = 0;
  let total = 0;

  // Fetch member's votes (paginated)
  let offset = 0;
  const limit = 250;
  while (true) {
    const url = `https://api.congress.gov/v3/member/${bioguideId}/votes?limit=${limit}&offset=${offset}`;
    const res = await fetch(url, { headers });
    if (!res.ok) break;
    const data = await res.json();
    const votes = data.votes || [];
    if (votes.length === 0) break;

    votes.forEach(vote => {
      if (vote.congress === 119) {
        total++;
        if (vote.position === 'Not Voting') missed++;
      }
    });

    if (votes.length < limit) break;
    offset += limit;
  }

  return { missedVotes: missed, totalVotes: total };
}

async function main() {
  const base = JSON.parse(fs.readFileSync('public/senators-rankings.json', 'utf8'));
  const output = [];

  for (const sen of base) {
    if (!sen.bioguideId) continue;
    console.log(`Fetching votes for ${sen.name} (${sen.bioguideId})`);
    const { missedVotes, totalVotes } = await getMissedVotesForSenator(sen.bioguideId);
    output.push({
      name: sen.name,
      missedVotes,
      totalVotes
    });
  }

  fs.writeFileSync('public/senators-votes.json', JSON.stringify(output, null, 2));
  console.log(`senators-votes.json updated!`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
