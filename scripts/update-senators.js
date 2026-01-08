const fs = require('fs');
const fetch = require('node-fetch');

const jsonPath = 'public/senators-rankings.json';  // Confirm this path matches your file location!
const senators = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

const apiKey = process.env.CONGRESS_API_KEY;
const headers = apiKey ? { 'X-Api-Key': apiKey } : {};

async function updateSenator(sen) {
  try {
    const base = `https://api.congress.gov/v3/member/${sen.bioguideId}`;
    const sponsoredUrl = `${base}/sponsored-legislation?limit=500`;
    const cosponsoredUrl = `${base}/cosponsored-legislation?limit=500`;

    const [sponsoredRes, cosponsoredRes] = await Promise.all([
      fetch(sponsoredUrl, { headers }),
      fetch(cosponsoredUrl, { headers })
    ]);

    let sponsoredCount = 0;
    if (sponsoredRes.ok) {
      const data = await sponsoredRes.json();
      // Filter to 119th Congress
      const items = data.sponsoredLegislation || [];
      sponsoredCount = items.filter(item => item.congress === 119).length;
    } else {
      console.log(`Sponsored error ${sen.name}: ${sponsoredRes.status}`);
    }

    let cosponsoredCount = 0;
    if (cosponsoredRes.ok) {
      const cosData = await cosponsoredRes.json();
      const cosItems = cosData.cosponsoredLegislation || [];
      cosponsoredCount = cosItems.filter(item => item.congress === 119).length;
    } else {
      console.log(`Cosponsored error ${sen.name}: ${cosponsoredRes.status}`);
    }

    sen.sponsoredBills = sponsoredCount;
    sen.cosponsoredBills = cosponsoredCount;

    console.log(`Updated ${sen.name}: sponsored ${sponsoredCount}, cosponsored ${cosponsoredCount}`);
  } catch (err) {
    console.log(`Error for ${sen.name}: ${err.message}`);
  }
}

(async () => {
  for (const sen of senators) {
    await updateSenator(sen);
    await new Promise(r => setTimeout(r, 1000));
  }
  fs.writeFileSync(jsonPath, JSON.stringify(senators, null, 2) + '\n');
  console.log('All done!');
})();
