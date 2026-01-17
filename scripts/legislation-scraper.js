// scripts/legislation-scraper.js
const fs = require('fs');
const path = require('path');
const https = require('https');
const unzipper = require('unzipper');

const RANKINGS_PATH = path.join(__dirname, '../public/senators-rankings.json');
const TOKEN = process.env.CONGRESS_API_KEY;   // Bulk download token
const SESSION = process.env.CONGRESS_NUMBER;  // e.g. "119"

const ZIP_URL = `https://api.legiscan.com/dl/?token=${TOKEN}&session=${SESSION}`;

async function fetchAndParse() {
  console.log(`Downloading LegiScan bulk dataset for session ${SESSION}...`);

  const zipPath = path.join(__dirname, 'legiscan.zip');
  const file = fs.createWriteStream(zipPath);

  await new Promise((resolve, reject) => {
    https.get(ZIP_URL, res => {
      res.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
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

  // … continue with your enrichment logic here …
}

fetchAndParse().catch(err => console.error('LegiScan scrape failed:', err));
