// scripts/legislation-debug.js
// Purpose: Quick diagnostic for House legislation API responses
// Fetches Alma Adams (A000370) sponsored legislation for Congress 119
// Prints the first record so we can inspect field names

const fetch = require('node-fetch');

const API_KEY = process.env.CONGRESS_API_KEY;
const CONGRESS = 119;
const BIOGUIDE_ID = 'A000370';

async function fetchMemberLegislation(bioguideId) {
  const url = `https://api.congress.gov/v3/member/${bioguideId}/sponsored-legislation?congress=${CONGRESS}&api_key=${API_KEY}&format=json&pageSize=1&offset=0`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`Request failed: ${res.status}`);
    return null;
  }
  const data = await res.json();
  return data.bills?.[0] || null;
}

(async function main() {
  if (!API_KEY) {
    console.error('Missing CONGRESS_API_KEY');
    process.exit(1);
  }

  const record = await fetchMemberLegislation(BIOGUIDE_ID);
  if (!record) {
    console.log('No record returned');
    return;
  }

  console.log('Sample sponsored legislation record for Alma Adams:');
  console.log(JSON.stringify(record, null, 2));
})();
