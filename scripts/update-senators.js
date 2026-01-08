const fs = require('fs');
const fetch = require('node-fetch');

const jsonPath = 'senators-rankings.json';
const senators = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

const apiKey = process.env.CONGRESS_API_KEY;
const headers = apiKey ? { 'X-Api-Key': apiKey } : {};  // Note: header is 'X-Api-Key' (capital A)

async function updateSenator(sen) {
  try {
    const baseUrl = `https://api.congress.gov/v3/member/${sen.bioguideId}`;
    const sponsoredUrl = `${baseUrl}/sponsored-legislation/119?limit=500`;
    const cosponsoredUrl = `${baseUrl}/cosponsored-legislation/119?limit=500`;

    const [sponsoredRes, cosponsoredRes] = await Promise.all([
      fetch(sponsoredUrl, { headers }),
      fetch(cosponsoredUrl, { headers })
    ]);

    if (sponsoredRes.ok) {
      const data = await sponsoredRes.json();
      sen.sponsoredBills = data.pagination?.count || 0;
      sen.sponsoredAmendments = data.amendments?.length || 0;  // If amendments separate
    }

    if (cosponsoredRes.ok) {
      const cosData = await cosponsoredRes.json();
      sen.cosponsoredBills = cosData.pagination?.count || 0;
      sen.cosponsoredAmendments = cosData.amendments?.length || 0;
    }

    // For becameLaw: We'd need to fetch bill details later if needed
    console.log(`Updated ${sen.name}: sponsored ${sen.sponsoredBills}, cosponsored ${sen.cosponsoredBills}`);
  } catch (err) {
    console.log(`Error updating ${sen.name}:`, err.message);
  }
}

async function main() {
  for (const sen of senators) {
    await updateSenator(sen);
    await new Promise(r => setTimeout(r, 1000));  // 1s delay to avoid rate limits
  }
  fs.writeFileSync(jsonPath, JSON.stringify(senators, null, 2) + '\n');
  console.log('Senators rankings updated!');
}

main().catch(console.error);
