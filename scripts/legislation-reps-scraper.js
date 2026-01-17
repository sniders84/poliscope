// scripts/legislation-reps-scraper.js
// Revamped to use GovInfo bulk BILLS XML (119th Congress, both sessions)
// Parses sponsor/cosponsor from XML, counts unique bills, infers enacted via 'enr' version presence
// Amendments = 0 for now

const fs = require('fs');
const https = require('https');
const path = require('path');
const { XMLParser } = require('fast-xml-parser'); // npm install fast-xml-parser

// Config
const BASE_URLS = [
  'https://www.govinfo.gov/bulkdata/xml/BILLS/119/1/hr/',
  'https://www.govinfo.gov/bulkdata/xml/BILLS/119/2/hr/'
];
const DOWNLOAD_DIR = path.join(__dirname, '../temp-bills-xml'); // Temp folder in repo or /tmp
const CHECKPOINT_INTERVAL = 50; // Save after processing this many bills

// Load reps
let reps = [];
try {
  reps = JSON.parse(fs.readFileSync('public/representatives-rankings.json', 'utf8'));
} catch (err) {
  console.error('Error loading rankings JSON:', err.message);
  process.exit(1);
}

// Map bioguideId → {sponsored: Set<string>, cosponsored: Set<string>, enactedSponsored: number, enactedCosponsored: number}
const repData = new Map();
reps.forEach(rep => {
  repData.set(rep.bioguideId, {
    sponsored: new Set(),
    cosponsored: new Set(),
    enactedSponsored: 0,
    enactedCosponsored: 0
  });
});

// Ensure download dir
if (!fs.existsSync(DOWNLOAD_DIR)) fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });

// Helper: Download file if not exists or outdated
function downloadFile(url, filePath) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(filePath)) {
      console.log(`Skipping existing: ${path.basename(filePath)}`);
      return resolve();
    }
    const file = fs.createWriteStream(filePath);
    https.get(url, res => {
      if (res.statusCode !== 200) {
        reject(new Error(`Download failed ${res.statusCode} for ${url}`));
        return;
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`Downloaded: ${path.basename(filePath)}`);
        resolve();
      });
    }).on('error', reject);
  });
}

// Helper: List directory files (simple HTML parse since no API)
async function listDirectory(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        // Crude HTML parse for <a href="...xml"> links
        const files = [];
        const matches = data.match(/<a href="([^"]+\.xml)">/g) || [];
        matches.forEach(m => {
          const href = m.match(/href="([^"]+)"/)[1];
          if (href.endsWith('.xml')) files.push(href);
        });
        resolve(files);
      });
    }).on('error', reject);
  });
}

// Parse single XML file
function parseBillXml(filePath) {
  const xml = fs.readFileSync(filePath, 'utf8');
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
  const json = parser.parse(xml);

  const bill = json.bill || {};
  const billNumber = bill.billNumber || 'unknown';
  const sponsor = bill.sponsor?.['_']?.['@_bioguideId'] || bill.sponsor?.bioguideId;
  const cosponsors = bill.cosponsors?.cosponsor || [];
  const cosponsorIds = Array.isArray(cosponsors) 
    ? cosponsors.map(c => c?.['_']?.['@_bioguideId'] || c.bioguideId).filter(Boolean)
    : [];

  const versions = bill.textVersions?.textVersion || [];
  const isEnacted = versions.some(v => v?.['_']?.['@_version']?.toLowerCase().includes('enr')); // Enrolled = likely enacted

  return { sponsor, cosponsorIds: [...new Set(cosponsorIds)], isEnacted, billId: billNumber };
}

// Main: Download + Parse
(async () => {
  for (const baseUrl of BASE_URLS) {
    console.log(`Processing session: ${baseUrl}`);
    const files = await listDirectory(baseUrl).catch(err => {
      console.error(`Failed to list ${baseUrl}: ${err.message}`);
      return [];
    });

    let processed = 0;
    for (const fileName of files) {
      const url = `${baseUrl}${fileName}`;
      const filePath = path.join(DOWNLOAD_DIR, fileName);

      try {
        await downloadFile(url, filePath);
        const { sponsor, cosponsorIds, isEnacted, billId } = parseBillXml(filePath);

        if (sponsor && repData.has(sponsor)) {
          const data = repData.get(sponsor);
          data.sponsored.add(billId);
          if (isEnacted) data.enactedSponsored++;
        }

        for (const cosId of cosponsorIds) {
          if (repData.has(cosId)) {
            const data = repData.get(cosId);
            data.cosponsored.add(billId);
            if (isEnacted) data.enactedCosponsored++;
          }
        }

        processed++;
        if (processed % CHECKPOINT_INTERVAL === 0) {
          console.log(`Checkpoint: Processed ${processed} bills`);
        }
      } catch (err) {
        console.error(`Error on ${fileName}: ${err.message}`);
      }
    }
  }

  // Update reps JSON
  reps.forEach(rep => {
    const data = repData.get(rep.bioguideId) || { sponsored: new Set(), cosponsored: new Set(), enactedSponsored: 0, enactedCosponsored: 0 };
    rep.sponsoredBills = data.sponsored.size;
    rep.cosponsoredBills = data.cosponsored.size;
    rep.becameLawBills = data.enactedSponsored;
    rep.becameLawCosponsoredBills = data.enactedCosponsored;
    // Amendments stay 0
    rep.sponsoredAmendments = 0;
    rep.cosponsoredAmendments = 0;
    rep.becameLawAmendments = 0;
    rep.becameLawCosponsoredAmendments = 0;
  });

  fs.writeFileSync('public/representatives-rankings.json', JSON.stringify(reps, null, 2));
  console.log('119th Congress bill data updated from GovInfo bulk!');
})();
