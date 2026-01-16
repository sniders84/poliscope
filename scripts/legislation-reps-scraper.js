// scripts/legislation-reps-scraper.js
// Purpose: Scrape House legislation (bills + resolutions + amendments) for the 119th Congress
// Enriches representatives-rankings.json with sponsor/cosponsor counts and became-law tallies (including cosponsored)

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const OUT_PATH = path.join(__dirname, '..', 'public', 'representatives-rankings.json');
const API_KEY = process.env.CONGRESS_API_KEY;
const CONGRESS = 119;

const TYPES = ['hr', 'hres', 'hconres', 'hjres'];

function ensureShape(rep) {
  rep.sponsoredBills = rep.sponsoredBills || 0;
  rep.cosponsoredBills = rep.cosponsoredBills || 0;
  rep.becameLawBills = rep.becameLawBills || 0;
  rep.becameLawCosponsoredBills = rep.becameLawCosponsoredBills || 0;
  rep.sponsoredAmendments = rep.sponsoredAmendments || 0;
  rep.cosponsoredAmendments = rep.cosponsoredAmendments || 0;
  rep.becameLawAmendments = rep.becameLawAmendments || 0;
  rep.becameLawCosponsoredAmendments = rep.becameLawCosponsoredAmendments || 0;
  return rep;
}

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.json();
}

async function fetchAllPages(baseUrl) {
  let url = baseUrl;
  const out = [];
  while (url) {
    const data = await fetchJSON(url);
    const chunk = data.bills || data.amendments || data.items || [];
    out.push(...chunk);
    url = data.pagination?.next_url
      ? `https://api.congress.gov${data.pagination.next_url}&api_key=${API_KEY}&format=json`
      : null;
  }
  return out;
}

async function fetchBillDetail(billUrl) {
  const url = `${billUrl}&api_key=${API_KEY}&format=json`;
  const data = await fetchJSON(url);
  return data.bill;
}

async function fetchAmendmentDetail(amendmentUrl) {
  const url = `${amendmentUrl}&api_key=${API_KEY}&format=json`;
  const data = await fetchJSON(url);
  return data.amendment;
}

function normalizePeople(maybeArrayOrObject) {
  if (!maybeArrayOrObject) return [];
  return Array.isArray(maybeArrayOrObject) ? maybeArrayOrObject : [maybeArrayOrObject];
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
  try {
    if (!API_KEY) {
      console.error('Missing CONGRESS_API_KEY');
      process.exit(1);
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
        const bill = await fetchBillDetail(b.url);
        if (!bill) continue;

        const sponsors = normalizePeople(bill.sponsors);
        const inlineCosponsors = bill.cosponsors?.items || [];

        // Sponsors
        for (const s of sponsors) {
          if (inc(repMap, s.bioguideId, 'sponsoredBills')) attached++;
        }

        // Cosponsors (inline)
        for (const c of inlineCosponsors) {
          if (inc(repMap, c.bioguideId, 'cosponsoredBills')) attached++;
        }

        // Cosponsors (list URL)
        if (bill.cosponsors?.url) {
          const cosponsorPages = await fetchAllPages(`${bill.cosponsors.url}&api_key=${API_KEY}&format=json`);
          for (const c of cosponsorPages) {
            if (inc(repMap, c.bioguideId, 'cosponsoredBills')) attached++;
          }
        }

        // Became law — sponsor & cosponsor tallies
        if (becamePublicLaw(bill.latestAction)) {
          for (const s of sponsors) {
            if (inc(repMap, s.bioguideId, 'becameLawBills')) lawsBillsSponsor++;
          }
          // Inline cosponsors
          for (const c of inlineCosponsors) {
            if (inc(repMap, c.bioguideId, 'becameLawCosponsoredBills')) lawsBillsCosponsor++;
          }
          // Cosponsor list URL
          if (bill.cosponsors?.url) {
            const cosponsorPages = await fetchAllPages(`${bill.cosponsors.url}&api_key=${API_KEY}&format=json`);
            for (const c of cosponsorPages) {
              if (inc(repMap, c.bioguideId, 'becameLawCosponsoredBills')) lawsBillsCosponsor++;
            }
          }
        }
      }
    }

    // Amendments (House-origin)
    const amdListUrl = `https://api.congress.gov/v3/amendment/${CONGRESS}?api_key=${API_KEY}&format=json&pageSize=250&offset=0`;
    const amendments = await fetchAllPages(amdListUrl);

    for (const a of amendments) {
      const amd = await fetchAmendmentDetail(a.url);
      if (!amd) continue;
      if ((amd.chamber || '').toLowerCase() !== 'house') continue;

      const sponsors = normalizePeople(amd.sponsors);
      const inlineCosponsors = amd.cosponsors?.items || [];

      // Sponsors
      for (const s of sponsors) {
        if (inc(repMap, s.bioguideId, 'sponsoredAmendments')) attached++;
      }

      // Cosponsors (inline)
      for (const c of inlineCosponsors) {
        if (inc(repMap, c.bioguideId, 'cosponsoredAmendments')) attached++;
      }

      // Cosponsors (list URL)
      if (amd.cosponsors?.url) {
        const cosponsorPages = await fetchAllPages(`${amd.cosponsors.url}&api_key=${API_KEY}&format=json`);
        for (const c of cosponsorPages) {
          if (inc(repMap, c.bioguideId, 'cosponsoredAmendments')) attached++;
        }
      }

      // Became law — sponsor & cosponsor tallies
      if (becamePublicLaw(amd.latestAction)) {
        for (const s of sponsors) {
          if (inc(repMap, s.bioguideId, 'becameLawAmendments')) lawsAmendsSponsor++;
        }
        for (const c of inlineCosponsors) {
          if (inc(repMap, c.bioguideId, 'becameLawCosponsoredAmendments')) lawsAmendsCosponsor++;
        }
        if (amd.cosponsors?.url) {
          const cosponsorPages = await fetchAllPages(`${amd.cosponsors.url}&api_key=${API_KEY}&format=json`);
          for (const c of cosponsorPages) {
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
  } catch (err) {
    console.error('Legislation scraper failed:', err.message);
    process.exit(1);
  }
})();
