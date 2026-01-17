const fs = require('fs');
const path = require('path');
const axios = require('axios');

const API_KEY = process.env.CONGRESS_API_KEY;
const CONGRESS = 119;
const repsPath = path.join(__dirname, '../public/representatives-rankings.json');
const reps = JSON.parse(fs.readFileSync(repsPath));

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
  for (const rep of reps) {
    const counts = await getCounts(rep.bioguideId);
    rep.sponsoredBills119 = counts.sponsored;
    rep.cosponsoredBills119 = counts.cosponsored;
  }
  fs.writeFileSync(repsPath, JSON.stringify(reps, null, 2));
  console.log('Updated House reps with 119th Congress sponsored/cosponsored counts');
})();
