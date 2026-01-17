// scripts/legislation-scraper.js
const fs = require('fs');
const path = require('path');
const https = require('https');
const unzipper = require('unzipper');

const RANKINGS_PATH = path.join(__dirname, '../public/senators-rankings.json');
const TOKEN = process.env.CONGRESS_API_KEY;
const SESSION = process.env.CONGRESS_NUMBER;
const ZIP_URL = `https://api.legiscan.com/dl/?token=${TOKEN}&session=${SESSION}`;

async function fetchAndParse() {
  console.log(`Downloading LegiScan bulk dataset for session ${SESSION}...`);
  const zipPath = path.join(__dirname, 'legiscan.zip');
  const file = fs.createWriteStream(zipPath);

  await new Promise((resolve, reject) => {
    https.get(ZIP_URL, res => {
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', reject);
  });

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

  // … enrichment logic …
}

fetchAndParse().catch(err => console.error('LegiScan scrape failed:', err));
