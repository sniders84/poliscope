const fs = require('fs');
const fetch = require('node-fetch');  // GitHub Actions has node-fetch pre-installed in recent images

const jsonPath = 'senators-rankings.json';
const senators = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

const apiKey = process.env.CONGRESS_API_KEY || '';  // Optional header
const headers = apiKey ? { 'X-API-Key': apiKey } : {};

async function updateSenator(sen) {
  const url = `https://api.congress.gov/v3/member/${sen.bioguideId}/sponsored-legislation?congress=119&limit=250`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    console.log(`Error for ${sen.name}: ${res.status}`);
    return;
  }
  const data = await res.json();
  sen.sponsoredBills = data.pagination?.count || 0;

  // Cosponsored
  const cosUrl = url.replace('sponsored-legislation', 'cosponsored-legislation');
  const cosRes = await fetch(cosUrl, { headers });
  if (cosRes.ok) {
    const cosData = await cosRes.json();
    sen.cosponsoredBills = cosData.pagination?.count || 0;
  }

  // Enacted: filter where becameLaw
  // We'll add later if needed
}

async function main() {
  for (const sen of senators) {
    await updateSenator(sen);
    await new Promise(r => setTimeout(r, 500));  // Polite delay
  }
  fs.writeFileSync(jsonPath, JSON.stringify(senators, null, 2));
  console.log('Updated!');
}

main().catch(console.error);
