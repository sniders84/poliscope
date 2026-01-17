// Senate votes scraper — full replacement

const fs = require('fs');
const path = require('path');
const https = require('https');
const unzipper = require('unzipper');

const RANKINGS_PATH = path.join(__dirname, '../public/senators-rankings.json');
const DATASET_URL = 'https://legiscan.com/gaits/datasets/2199/json/US_2025-2026_119th_Congress_JSON_20260109_68e7bd7db67acea9876b963a8a573396.zip';

async function fetchAndParse() {
  console.log(`Downloading LegiScan bulk dataset for 119th Congress (Senate votes)...`);

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

  const senators = JSON.parse(fs.readFileSync(RANKINGS_PATH, 'utf8'));
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
      const senator = senators.find(s => s.bioguideId === entry.bioguide_id);
      if (senator) {
        senator.yeaVotes = (senator.yeaVotes || 0) + (entry.vote === 'Yea' ? 1 : 0);
        senator.nayVotes = (senator.nayVotes || 0) + (entry.vote === 'Nay' ? 1 : 0);
        senator.missedVotes = (senator.missedVotes || 0) + (entry.vote === 'Not Voting' ? 1 : 0);
        senator.totalVotes = (senator.totalVotes || 0) + 1;
      }
    });
  });

  senators.forEach(s => {
    const total = s.totalVotes || 0;
    const missed = s.missedVotes || 0;
    s.participationPct = total > 0 ? (((total - missed) / total) * 100).toFixed(2) : "0.00";
  });

  fs.writeFileSync(RANKINGS_PATH, JSON.stringify(senators, null, 2));
  console.log(`Updated vote tallies for ${senators.length} senators`);
}

fetchAndParse().catch(err => console.error('LegiScan votes scrape failed:', err));
