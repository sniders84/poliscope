// scripts/votes-reps-scraper.js
// Full replacement: fetch LegiScan bulk dataset, unzip, and enrich representatives-rankings.json with vote tallies

const fs = require('fs');
const path = require('path');
const https = require('https');
const unzipper = require('unzipper');

const RANKINGS_PATH = path.join(__dirname, '../public/representatives-rankings.json');
const DATASET_URL = 'https://legiscan.com/gaits/datasets/2199/json/US_2025-2026_119th_Congress_JSON_20260109_68e7bd7db67acea9876b963a8a573396.zip';

async function fetchAndParse() {
  console.log(`Downloading LegiScan bulk dataset for 119th Congress (House votes)...`);

  const zipPath = path.join(__dirname, 'legiscan.zip');
  const file = fs.createWriteStream(zipPath);

  await new Promise((resolve, reject) => {
    https.get(DATASET_URL, res => {
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', reject);
  });

  console.log('Unzipping LegiScan dataset...');
  await fs.createReadStream(zipPath)
    .pipe(unzipper.Extract({ path: path.join(__dirname, 'legiscan') }))
    .promise();

  const reps = JSON.parse(fs.readFileSync(RANKINGS_PATH, 'utf8'));

  const votesDir = path.join(__dirname, 'legiscan', 'vote');
  if (!fs.existsSync(votesDir)) {
    console.error('Votes directory not found in LegiScan dataset.');
    return;
  }

  const files = fs.readdirSync(votesDir);
  files.forEach(file => {
    const vote = JSON.parse(fs.readFileSync(path.join(votesDir, file), 'utf8'));
    const roll = vote.roll_call || [];
    roll.forEach(entry => {
      const rep = reps.find(r => r.bioguideId === entry.bioguide_id);
      if (rep) {
        rep.yeaVotes = (rep.yeaVotes || 0) + (entry.vote === 'Yea' ? 1 : 0);
        rep.nayVotes = (rep.nayVotes || 0) + (entry.vote === 'Nay' ? 1 : 0);
        rep.missedVotes = (rep.missedVotes || 0) + (entry.vote === 'Not Voting' ? 1 : 0);
        rep.totalVotes = (rep.totalVotes || 0) + 1;
      }
    });
  });

  reps.forEach(r => {
    const total = r.totalVotes || 0;
    const missed = r.missedVotes || 0;
    r.participationPct = total > 0 ? (((total - missed) / total) * 100).toFixed(2) : "0.00";
  });

  fs.writeFileSync(RANKINGS_PATH, JSON.stringify(reps, null, 2));
  console.log(`Updated vote tallies for ${reps.length} representatives`);
}

fetchAndParse().catch(err => console.error('Legiscan votes scrape failed:', err));
