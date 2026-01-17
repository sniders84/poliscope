const fs = require('fs');
const path = require('path');
const axios = require('axios');

const API_KEY = process.env.CONGRESS_API_KEY;
const OUT = path.join(__dirname, '../public/senate-votes.json');

async function fetchAllVotes() {
  const base = `https://api.congress.gov/v3/rollcall-vote?congress=119&chamber=senate&api_key=${API_KEY}&limit=250`;
  let offset = 0;
  const votes = [];
  while (true) {
    const url = `${base}&offset=${offset}`;
    const { data } = await axios.get(url);
    if (Array.isArray(data.rollCallVotes)) votes.push(...data.rollCallVotes);
    if (!data.pagination || data.pagination.next === null) break;
    offset = data.pagination.next;
  }
  return votes;
}

(async () => {
  const votes = await fetchAllVotes();
  fs.writeFileSync(OUT, JSON.stringify({ votes }, null, 2));
  console.log(`Saved Senate votes: ${votes.length} votes`);
})().catch(err => {
  console.error('Senate votes fetch failed:', err.message);
  process.exit(1);
});
