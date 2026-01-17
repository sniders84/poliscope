const fs = require('fs');
const path = require('path');
const axios = require('axios');

const API_KEY = process.env.CONGRESS_API_KEY;
const OUT = path.join(__dirname, '../public/house-legislation.json');

async function fetchAllBills() {
  const base = `https://api.congress.gov/v3/bill?congress=119&chamber=house&api_key=${API_KEY}&limit=250`;
  let offset = 0;
  const bills = [];
  while (true) {
    const url = `${base}&offset=${offset}`;
    const { data } = await axios.get(url);
    if (Array.isArray(data.bills)) bills.push(...data.bills);
    if (!data.pagination || data.pagination.next === null) break;
    offset = data.pagination.next;
  }
  return bills;
}

(async () => {
  const bills = await fetchAllBills();
  fs.writeFileSync(OUT, JSON.stringify({ bills }, null, 2));
  console.log(`Saved House legislation: ${bills.length} bills`);
})().catch(err => {
  console.error('House legislation fetch failed:', err.message);
  process.exit(1);
});
