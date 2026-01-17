// scripts/votes-scraper.js
// Full replacement: fetch LegiScan bulk dataset, diagnostic logging, and enrichment of senators-rankings.json with vote tallies

const fs = require('fs');
const path = require('path');
const https = require('https');
const unzipper = require('unzipper');

const RANKINGS_PATH = path.join(__dirname, '../public/senators-rankings.json');
const TOKEN = process.env.CONGRESS_API_KEY;   // Bulk download token
const SESSION = process.env.CONGRESS_NUMBER;  // e.g. "119"

const ZIP_URL = `https://api.legiscan.com/dl/?token=${TOKEN}&session=${SESSION}`;

async function fetchAndParse() {
  console.log(`Downloading LegiScan bulk dataset for session ${SESSION} (votes)...`);

  const zipPath = path.join(__dirname, 'legiscan.zip');
  const file = fs.createWriteStream(zipPath);

  await new Promise((resolve, reject) => {
    https.get(ZIP_URL, res => {
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', reject);
  });

  // Diagnostic: check file signature + head
  const buf = fs.readFileSync(zipPath);
  const sig = buf.slice(0, 4).toString('hex');
  console.log(`Downloaded file signature: ${sig}`);
  console.log(`First 200 bytes:\n${buf.slice(0, 200).toString()}`);

  if (sig !== '504b0304') {
    console.error('Not a valid ZIP file — check your token or endpoint.');
    return;
  }

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
