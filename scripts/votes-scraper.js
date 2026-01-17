const fs = require('fs');
const path = require('path');
const axios = require('axios');

const API_KEY = process.env.CONGRESS_API_KEY;
const URL = `https://api.congress.gov/v3/vote?congress=119&chamber=senate&api_key=${API_KEY}`;
const OUT = path.join(__dirname, '../public/senate-votes.json');

async function run() {
  const { data } = await axios.get(URL);
  fs.writeFileSync(OUT, JSON.stringify(data, null, 2));
  console.log(`Saved Senate votes: ${data.votes?.length || 0} votes`);
}

run().catch(err => {
  console.error('Senate votes fetch failed:', err.message);
  process.exit(1);
});
