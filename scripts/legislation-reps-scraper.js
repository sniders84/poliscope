// scripts/legislation-reps-scraper.js
// Purpose: Scrape House legislation for the 119th Congress
// Adds sponsor/cosponsor counts and became-law tallies (new fields)

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const OUT_PATH = path.join(__dirname, '..', 'public', 'representatives-rankings.json');
const API_KEY = process.env.CONGRESS_API_KEY;
const CONGRESS = 119;
const TYPES = ['hr', 'hres', 'hconres', 'hjres'];

function ensureShape(r) {
  r.sponsoredBills ??= 0;
  r.cosponsoredBills ??= 0;
  r.becameLawBills ??= 0;
  r.becameLawCosponsoredBills ??= 0;
  r.sponsoredAmendments ??= 0;
  r.cosponsoredAmendments ??= 0;
  r.becameLawAmendments ??= 0;
  r.becameLawCosponsoredAmendments ??= 0;
  return r;
}

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json();
}

async function fetchAllPages(baseUrl) {
  let url = baseUrl;
  const out = [];
  while (url) {
    const data = await fetchJSON(url);
    if (!data) break;
    const chunk = data.bills || data.amendments || data.items || [];
    out.push(...chunk);
    url = data.pagination?.next_url
      ? `https://api.congress.gov${data.pagination.next_url}&api_key=${API_KEY}&format=json`
      : null;
  }
  return out;
}

function normalizePeople(x) {
  if (!x) return [];
  return Array.isArray(x) ? x : [x];
}

function becamePublicLaw(latestAction) {
  const a = (latestAction?.action || '').toLowerCase();
  return a.includes('became public law') || a.includes('public law');
}

function inc(map, id, field) {
  if (!id || !map.has(id)) return false;
  map.get(id)[field]++;
  return true;
}

(async function main() {
  if (!API_KEY) {
    console.log('Missing CONGRESS_API_KEY');
    process.exit(0);
  }

  const reps = JSON.parse(fs.readFileSync(OUT_PATH, 'utf-8')).map(ensureShape);
  const repMap = new Map(reps.map(r => [r.bioguideId, r]));

  let attached = 0;
  let lawsBillsSponsor = 0;
  let lawsBillsCosponsor = 0;
  let lawsAmendsSponsor = 0;
  let lawsAmendsCosponsor = 0;

  // Bills + resolutions
  for (const type of TYPES) {
    const listUrl = `https://api.congress.gov/v3/bill/${CONGRESS}/${type}?api_key=${API_KEY}&format=json&pageSize=250&offset=0`;
    const bills = await fetchAllPages(listUrl);

    for (const b of bills) {
      const detail = await fetchJSON(`${b.url}&api_key=${API_KEY}&format=json`);
      const bill = detail?.bill;
      if (!bill) continue;

      const sponsors = normalizePeople(bill.sponsors);
      const inlineCosponsors = bill.cosponsors?.items || [];

      for (const s of sponsors) {
        if (inc(repMap, s.bioguideId, 'sponsoredBills')) attached++;
      }
      for (const c of inlineCosponsors) {
        if (inc(repMap, c.bioguideId, 'cosponsoredBills')) attached++;
      }
      if (bill.cosponsors?.url) {
        const cosPages = await fetchAllPages(`${bill.cosponsors.url}&api_key=${API_KEY}&format=json`);
        for (const c of cosPages) {
          if (inc(repMap, c.bioguideId, 'cosponsoredBills')) attached++;
        }
      }

      if (becamePublicLaw(bill.latestAction)) {
        for (const s of sponsors) {
          if (inc(repMap, s.bioguideId, 'becameLawBills')) lawsBillsSponsor++;
        }
        for (const c of inlineCosponsors) {
          if (inc(repMap, c.bioguideId, 'becameLawCosponsoredBills')) lawsBillsCosponsor++;
        }
        if (bill.cosponsors?.url) {
          const cosPages = await fetchAllPages(`${bill.cosponsors.url}&api_key=${API_KEY}&format=json`);
          for (const c of cosPages) {
            if (inc(repMap, c.bioguideId, 'becameLawCosponsoredBills')) lawsBillsCosponsor++;
          }
        }
      }
    }
  }

  // Amendments (House-origin only)
  const amdListUrl = `https://api.congress.gov/v3/amendment/${CONGRESS}?api_key=${API_KEY}&format=json&pageSize=250&offset=0`;
  const amendments = await fetchAllPages(amdListUrl);

  for (const a of amendments) {
    const detail = await fetchJSON(`${a.url}&api_key=${API_KEY}&format=json`);
    const amd = detail?.amendment;
    if (!amd) continue;
    if ((amd.chamber || '').toLowerCase() !== 'house') continue;

    const sponsors = normalizePeople(amd.sponsors);
    const inlineCosponsors = amd.cosponsors?.items || [];

    for (const s of sponsors) {
      if (inc(repMap, s.bioguideId, 'sponsoredAmendments')) attached++;
    }
    for (const c of inlineCosponsors) {
      if (inc(repMap, c.bioguideId, 'cosponsoredAmendments')) attached++;
    }
    if (amd.cosponsors?.url) {
      const cosPages = await fetchAllPages(`${amd.cosponsors.url}&api_key=${API_KEY}&format=json`);
      for (const c of cosPages) {
        if (inc(repMap, c.bioguideId, 'cosponsoredAmendments')) attached++;
      }
    }

    if (becamePublicLaw(amd.latestAction)) {
      for (const s of sponsors) {
        if (inc(repMap, s.bioguideId, 'becameLawAmendments')) lawsAmendsSponsor++;
      }
      for (const c of inlineCosponsors) {
        if (inc(repMap, c.bioguideId, 'becameLawCosponsoredAmendments')) lawsAmendsCosponsor++;
      }
      if (amd.cosponsors?.url) {
        const cosPages = await fetchAllPages(`${amd.cosponsors.url}&api_key=${API_KEY}&format=json`);
        for (const c of cosPages) {
          if (inc(repMap, c.bioguideId, 'becameLawCosponsoredAmendments')) lawsAmendsCosponsor++;
        }
      }
    }
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(reps, null, 2));
  console.log(
    `Updated representatives-rankings.json with legislation + amendments: ` +
    `${attached} sponsor/cosponsor entries; ` +
    `became law — bills (sponsor): ${lawsBillsSponsor}, bills (cosponsor): ${lawsBillsCosponsor}, ` +
    `amendments (sponsor): ${lawsAmendsSponsor}, amendments (cosponsor): ${lawsAmendsCosponsor}`
  );
})();
