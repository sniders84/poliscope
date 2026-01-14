// legislation-scraper.js
// Fetches LegiScan US.zip dataset, extracts bills.json for 119th Congress
// Outputs public/senators-legislation.json

const fs = require('fs');
const fetch = require('node-fetch');
const AdmZip = require('adm-zip');

// Load legislators metadata
const legislators = JSON.parse(fs.readFileSync('public/legislators-current.json', 'utf8'));
const senators = legislators.filter(l => l.terms.some(t => t.type === 'sen'));
const byBioguide = new Map(senators.map(s => [s.id.bioguide, s]));

// LegiScan dataset ZIP URL
const DATASET_URL = 'https://legiscan.com/US/datasets/US.zip';

async function getBills() {
  console.log('Downloading LegiScan US.zip...');
  const res = await fetch(DATASET_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${DATASET_URL}`);
  const buffer = await res.buffer();

  const zip = new AdmZip(buffer);
  const entry = zip.getEntry('bills.json');
  if (!entry) throw new Error('bills.json not found in dataset');
  const bills = JSON.parse(entry.getData().toString('utf8'));
  return bills;
}

async function run() {
  const bills = await getBills();

  // Filter to 119th Congress only
  const bills119 = bills.filter(b => Number(b.congress) === 119);

  // Initialize tallies
  const totals = new Map();
  for (const s of senators) {
    totals.set(s.id.bioguide, {
      sponsoredBills: 0,
      cosponsoredBills: 0,
      becameLawSponsoredBills: 0,
      becameLawCosponsoredBills: 0,
    });
  }

  for (const bill of bills119) {
    const sponsorId = bill.sponsor_bioguide;
    if (sponsorId && totals.has(sponsorId)) {
      const entry = totals.get(sponsorId);
      entry.sponsoredBills += 1;
      if (/became public law/i.test(bill.status_text)) {
        entry.becameLawSponsoredBills += 1;
      }
    }

    if (bill.cosponsors) {
      const cosponsors = bill.cosponsors.split(';').map(c => c.trim());
      for (const cos of cosponsors) {
        if (totals.has(cos)) {
          const entry = totals.get(cos);
          entry.cosponsoredBills += 1;
          if (/became public law/i.test(bill.status_text)) {
            entry.becameLawCosponsoredBills += 1;
          }
        }
      }
    }
  }

  const results = [];
  for (const [bioguideId, t] of totals.entries()) {
    results.push({
      bioguideId,
      sponsoredBills: t.sponsoredBills,
      cosponsoredBills: t.cosponsoredBills,
      becameLawSponsoredBills: t.becameLawSponsoredBills,
      becameLawCosponsoredBills: t.becameLawCosponsoredBills,
    });
  }

  fs.writeFileSync('public/senators-legislation.json', JSON.stringify(results, null, 2));
  console.log('Legislation scraper complete!');
}

run().catch(err => console.error(err));
