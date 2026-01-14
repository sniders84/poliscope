// legislation-scraper.js
// Downloads LegiScan bulk dataset ZIP via download token, extracts bills.json
// Outputs public/senators-legislation.json

const fs = require('fs');
const fetch = require('node-fetch');
const AdmZip = require('adm-zip');

const TOKEN = process.env.CONGRESS_API_KEY; // your LegiScan download token
const DATASET_URL = `https://api.legiscan.com/dl/?token=${TOKEN}&session=2199`;

const legislators = JSON.parse(fs.readFileSync('public/legislators-current.json', 'utf8'));
const senators = legislators.filter(l => l.terms.some(t => t.type === 'sen'));
const byBioguide = new Map(senators.map(s => [s.id.bioguide, s]));

async function getBills() {
  console.log('Downloading LegiScan bulk ZIP...');
  const res = await fetch(DATASET_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${DATASET_URL}`);
  const buffer = await res.buffer();

  // Guard: check if response is JSON error
  const header = buffer.toString('utf8', 0, 20);
  if (header.startsWith('{')) {
    throw new Error(`LegiScan returned JSON instead of ZIP: ${header}`);
  }

  const zip = new AdmZip(buffer);
  const entry = zip.getEntry('bills.json');
  if (!entry) throw new Error('bills.json not found in dataset');
  return JSON.parse(entry.getData().toString('utf8'));
}

async function run() {
  const bills = await getBills();

  const totals = new Map();
  for (const s of senators) {
    totals.set(s.id.bioguide, {
      sponsoredBills: 0,
      cosponsoredBills: 0,
      becameLawSponsoredBills: 0,
      becameLawCosponsoredBills: 0,
    });
  }

  for (const bill of bills) {
    const sponsorId = bill.sponsor_bioguide;
    if (sponsorId && totals.has(sponsorId)) {
      const entry = totals.get(sponsorId);
      entry.sponsoredBills++;
      if (/became public law/i.test(bill.status_text)) {
        entry.becameLawSponsoredBills++;
      }
    }
    if (bill.cosponsors) {
      for (const cos of bill.cosponsors) {
        if (totals.has(cos.bioguide)) {
          const entry = totals.get(cos.bioguide);
          entry.cosponsoredBills++;
          if (/became public law/i.test(bill.status_text)) {
            entry.becameLawCosponsoredBills++;
          }
        }
      }
    }
  }

  const results = Array.from(totals.entries()).map(([bioguideId, t]) => ({ bioguideId, ...t }));
  fs.writeFileSync('public/senators-legislation.json', JSON.stringify(results, null, 2));
  console.log('Legislation scraper complete!');
}

run().catch(err => console.error(err));
