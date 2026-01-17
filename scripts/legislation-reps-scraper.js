const fs = require('fs');
const path = require('path');
const axios = require('axios');

const API_KEY = process.env.CONGRESS_API_KEY;
const URL = `https://api.congress.gov/v3/bill?congress=119&chamber=house&api_key=${API_KEY}`;
const OUT = path.join(__dirname, '../public/house-legislation.json');

async function run() {
  const { data } = await axios.get(URL);
  fs.writeFileSync(OUT, JSON.stringify(data, null, 2));
  console.log(`Saved House legislation: ${data.bills?.length || 0} bills`);
}

run().catch(err => {
  console.error('House legislation fetch failed:', err.message);
  process.exit(1);
});
