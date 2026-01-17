// scripts/legislation-reps-scraper.js
// Purpose: Update representatives-rankings.json with sponsored/cosponsored bill counts for the 119th Congress

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
    try {
      const counts = await getCounts(rep.bioguideId);

      // Update schema fields
      rep.sponsoredBills = counts.sponsored;
      rep.cosponsoredBills = counts.cosponsored;

      // Ensure other schema fields exist (don’t wipe them out)
      rep.sponsoredAmendments = rep.sponsoredAmendments || 0;
      rep.cosponsoredAmendments = rep.cosponsoredAmendments || 0;
      rep.becameLawBills = rep.becameLawBills || 0;

      rep.yeaVotes = rep.yeaVotes || 0;
      rep.nayVotes = rep.nayVotes || 0;
      rep.missedVotes = rep.missedVotes || 0;
      rep.totalVotes = rep.totalVotes || 0;
      rep.participationPct = rep.participationPct || 0;
      rep.missedVotePct = rep.missedVotePct || 0;

      rep.committees = rep.committees || [];

      rep.rawScore = rep.rawScore || 0;
      rep.score = rep.score || 0;
      rep.scoreNormalized = rep.scoreNormalized || 0;

      console.log(`${rep.name}: sponsored=${counts.sponsored}, cosponsored=${counts.cosponsored}`);
    } catch (err) {
      console.error(`Failed for ${rep.bioguideId}: ${err.message}`);
    }
  }

  fs.writeFileSync(repsPath, JSON.stringify(reps, null, 2));
  console.log('Updated representatives-rankings.json with 119th Congress sponsored/cosponsored counts');
})();
