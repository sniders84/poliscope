// Senate legislation scraper — full replacement

const fs = require('fs');
const path = require('path');
const https = require('https');
const unzipper = require('unzipper');

const RANKINGS_PATH = path.join(__dirname, '../public/senators-rankings.json');
const DATASET_URL = 'https://legiscan.com/gaits/datasets/2199/json/US_2025-2026_119th_Congress_JSON_20260109_68e7bd7db67acea9876b963a8a573396.zip';

async function fetchAndParse() {
  console.log(`Downloading LegiScan bulk dataset for 119th Congress (Senate legislation)...`);

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
  const billsDir = path.join(__dirname, 'legiscan', 'bill');
  if (!fs.existsSync(billsDir)) {
    console.error('Bills directory not found in LegiScan dataset.');
    return;
  }

  const files = fs.readdirSync(billsDir);
  files.forEach(file => {
    const bill = JSON.parse(fs.readFileSync(path.join(billsDir, file), 'utf8'));
    const sponsors = bill.sponsors || [];
    sponsors.forEach(sp => {
      const senator = senators.find(s => s.bioguideId === sp.bioguide_id);
      if (senator) {
        senator.sponsoredBills = (senator.sponsoredBills || 0) + 1;
        if (bill.status === 'passed') {
          senator.becameLawBills = (senator.becameLawBills || 0) + 1;
        }
      }
    });
  });

  fs.writeFileSync(RANKINGS_PATH, JSON.stringify(senators, null, 2));
  console.log(`Updated legislation tallies for ${senators.length} senators`);
}

fetchAndParse().catch(err => console.error('LegiScan scrape failed:', err));
