// scripts/legislation-reps-scraper.js
// Purpose: Scrape House legislation (bills + resolutions) for the 119th Congress
// Updates representatives-legislation.json with sponsor/cosponsor counts

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const OUT_PATH = path.join(__dirname, '..', 'public', 'representatives-legislation.json');
const API_KEY = process.env.CONGRESS_API_KEY;
const CONGRESS = 119;

// House bill types
const TYPES = ['hr', 'hres', 'hconres', 'hjres'];

async function fetchAll(url) {
  let results = [];
  while (url) {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`Bad response ${res.status} for ${url}`);
      break;
    }
    const data = await res.json();
    results = results.concat(data.bills || []);
    url = data.pagination?.next_url
      ? `https://api.congress.gov${data.pagination.next_url}&api_key=${API_KEY}&format=json`
      : null;
  }
  return results;
}

async function fetchDetail(billUrl) {
  const detailUrl = `${billUrl}&api_key=${API_KEY}&format=json`;
  const res = await fetch(detailUrl);
  if (!res.ok) {
    console.error(`Bad detail response ${res.status} for ${detailUrl}`);
    return null;
  }
  const data = await res.json();
  return data.bill;
}

(async function main() {
  const repsMap = new Map(); // keyed by bioguideId

  for (const type of TYPES) {
    let url = `https://api.congress.gov/v3/bill/${CONGRESS}/${type}?api_key=${API_KEY}&format=json&pageSize=250&offset=0`;
    const bills = await fetchAll(url);

    for (const bill of bills) {
      const detail = await fetchDetail(bill.url);
      if (!detail) continue;

      // Sponsors: always an array
      for (const s of detail.sponsors || []) {
        if (s.bioguideId) {
          const id = s.bioguideId;
          if (!repsMap.has(id)) repsMap.set(id, { bioguideId: id, sponsoredBills: 0, cosponsoredBills: 0 });
          repsMap.get(id).sponsoredBills++;
        }
      }

      // Cosponsors: object with items array
      for (const c of detail.cosponsors?.items || []) {
        if (c.bioguideId) {
          const id = c.bioguideId;
          if (!repsMap.has(id)) repsMap.set(id, { bioguideId: id, sponsoredBills: 0, cosponsoredBills: 0 });
          repsMap.get(id).cosponsoredBills++;
        }
      }
    }
  }

  const output = Array.from(repsMap.values());
  fs.writeFileSync(OUT_PATH, JSON.stringify(output, null, 2));
  console.log(`Updated representatives-legislation.json with ${output.length} House members and their bill counts`);
})();
