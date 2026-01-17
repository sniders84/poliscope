const fs = require('fs');
const path = require('path');
const axios = require('axios');

const API_KEY = process.env.CONGRESS_API_KEY;
const CONGRESS = 119;
const sensPath = path.join(__dirname, '../public/senators-rankings.json');
const sens = JSON.parse(fs.readFileSync(sensPath));

async function getCounts(bioguideId) {
  const sponsoredURL = `https://api.congress.gov/v3/member/${bioguideId}/sponsored-legislation?congress=${CONGRESS}&api_key=${API_KEY}`;
  const cosponsoredURL = `https://api.congress.gov/v3/member/${bioguideId}/cosponsored-legislation?congress=${CONGRESS}&api_key=${API_KEY}`;

  const [sponsoredRes, cosponsoredRes] = await Promise.all([
    axios.get(sponsoredURL),
    axios.get(cosponsoredURL)
  ]);

  return {
    sponsored: sponsoredRes.data?.legislation?.length || 0,
    cosponsored: cosponsoredRes.data?.legislation?.length || 0
  };
}

(async () => {
  for (const sen of sens) {
    const counts = await getCounts(sen.bioguideId);
    sen.sponsoredBills119 = counts.sponsored;
    sen.cosponsoredBills119 = counts.cosponsored;
  }
  fs.writeFileSync(sensPath, JSON.stringify(sens, null, 2));
  console.log('Updated Senators with 119th Congress sponsored/cosponsored counts');
})();
