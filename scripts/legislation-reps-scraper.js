// House legislation scraper — full replacement

const fs = require('fs');
const path = require('path');
const https = require('https');
const unzipper = require('unzipper');

const RANKINGS_PATH = path.join(__dirname, '../public/representatives-rankings.json');
const DATASET_URL = `https://api.legiscan.com/dl/?token=${process.env.CONGRESS_API_KEY}&dataset=2199`;

async function fetchAndParse() {
  console.log(`Downloading LegiScan bulk dataset for 119th Congress (House legislation)...`);

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
      const rep = reps.find(r => r.bioguideId === sp.bioguide_id);
      if (rep) {
        rep.sponsoredBills = (rep.sponsoredBills || 0) + 1;
        if (bill.status === 'passed') {
          rep.becameLawBills = (rep.becameLawBills || 0) + 1;
        }
      }
    });
  });

  fs.writeFileSync(RANKINGS_PATH, JSON.stringify(reps, null, 2));
  console.log(`Updated legislation tallies for ${reps.length} representatives`);
}

fetchAndParse().catch(err => console.error('Legiscan scrape failed:', err));
