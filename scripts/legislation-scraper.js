// scripts/legislation-scraper.js
// Purpose: Update senators-rankings.json with sponsored/cosponsored bill counts for the 119th Congress

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
    try {
      const counts = await getCounts(sen.bioguideId);

      // Update schema fields
      sen.sponsoredBills = counts.sponsored;
      sen.cosponsoredBills = counts.cosponsored;

      // Ensure other schema fields exist (don’t wipe them out)
      sen.sponsoredAmendments = sen.sponsoredAmendments || 0;
      sen.cosponsoredAmendments = sen.cosponsoredAmendments || 0;
      sen.becameLawBills = sen.becameLawBills || 0;

      sen.yeaVotes = sen.yeaVotes || 0;
      sen.nayVotes = sen.nayVotes || 0;
      sen.missedVotes = sen.missedVotes || 0;
      sen.totalVotes = sen.totalVotes || 0;
      sen.participationPct = sen.participationPct || 0;
      sen.missedVotePct = sen.missedVotePct || 0;

      sen.committees = sen.committees || [];

      sen.rawScore = sen.rawScore || 0;
      sen.score = sen.score || 0;
      sen.scoreNormalized = sen.scoreNormalized || 0;

      console.log(`${sen.name}: sponsored=${counts.sponsored}, cosponsored=${counts.cosponsored}`);
    } catch (err) {
      console.error(`Failed for ${sen.bioguideId}: ${err.message}`);
    }
  }

  fs.writeFileSync(sensPath, JSON.stringify(sens, null, 2));
  console.log('Updated senators-rankings.json with 119th Congress sponsored/cosponsored counts');
})();
