const fs = require('fs');
const fetch = require('node-fetch');

const baseData = JSON.parse(fs.readFileSync('public/senators-rankings.json', 'utf8'));
const jsonPath = 'public/senators-votes.json';

const apiKey = process.env.CONGRESS_API_KEY;
const headers = apiKey ? { 'X-Api-Key': apiKey } : {};

// Fetch paginated votes for a senator
async function fetchAllVotes(bioguideId) {
  const pageSize = 250;
  let offset = 0;
  let allVotes = [];
  while (true) {
    const url = `https://api.congress.gov/v3/member/${bioguideId}/votes?limit=${pageSize}&offset=${offset}`;
    const res = await fetch(url, { headers });
    if (!res.ok) break;
    const data = await res.json();
    const votes = data.votes || [];
    allVotes = allVotes.concat(votes);
    if (votes.length < pageSize) break;
    offset += pageSize;
  }
  return allVotes;
}

async function updateVotes(sen) {
  let missedVotes = 0;
  let totalVotes = 0;

  const allVotes = await fetchAllVotes(sen.bioguideId);

  allVotes.forEach(vote => {
    if (vote.congress === 119) {  // Full 119th only; comment out for entire career
      totalVotes++;
      if (vote.position === 'Not Voting') missedVotes++;
    }
  });

  return {
    name: sen.name,
    bioguideId: sen.bioguideId,
    missedVotes,
    totalVotes
  };
}

(async () => {
  const output = [];
  for (const sen of baseData) {
    try {
      const record = await updateVotes(sen);
      output.push(record);
      console.log(`Updated ${sen.name}: missedVotes ${record.missedVotes}, totalVotes ${record.totalVotes}`);
    } catch (err) {
      console.log(`Error for ${sen.name}: ${err.message}`);
    }
  }

  fs.writeFileSync(jsonPath, JSON.stringify(output, null, 2) + '\n');
  console.log('senators-votes.json fully updated!');
})();
