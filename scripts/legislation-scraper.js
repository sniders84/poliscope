// legislation-scraper.js
// Uses LegiScan API with API key from secrets
// Outputs public/senators-legislation.json

const fs = require('fs');
const fetch = require('node-fetch');

const API_KEY = process.env.LEGISCAN_API_KEY;
const MASTERLIST_URL = `https://api.legiscan.com/?key=${API_KEY}&op=getMasterList&state=US`;

// Load legislators metadata
const legislators = JSON.parse(fs.readFileSync('public/legislators-current.json', 'utf8'));
const senators = legislators.filter(l => l.terms.some(t => t.type === 'sen'));
const byBioguide = new Map(senators.map(s => [s.id.bioguide, s]));

async function run() {
  console.log('Fetching LegiScan MasterList...');
  const res = await fetch(MASTERLIST_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${MASTERLIST_URL}`);
  const data = await res.json();

  const bills = Object.values(data.masterlist).filter(b => Number(b.congress) === 119);

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
      entry.sponsoredBills += 1;
      if (/became public law/i.test(bill.status)) {
        entry.becameLawSponsoredBills += 1;
      }
    }
    if (bill.cosponsors) {
      for (const cos of bill.cosponsors) {
        if (totals.has(cos.bioguide)) {
          const entry = totals.get(cos.bioguide);
          entry.cosponsoredBills += 1;
          if (/became public law/i.test(bill.status)) {
            entry.becameLawCosponsoredBills += 1;
          }
        }
      }
    }
  }

  const results = [];
  for (const [bioguideId, t] of totals.entries()) {
    results.push({ bioguideId, ...t });
  }

  fs.writeFileSync('public/senators-legislation.json', JSON.stringify(results, null, 2));
  console.log('Legislation scraper complete!');
}

run().catch(err => console.error(err));
