// scripts/legislation-reps-scraper.js
// Purpose: Scrape House legislation (bills + resolutions + amendments) for the 119th Congress
// Enriches representatives-rankings.json with sponsor/cosponsor counts and became-law tallies

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const OUT_PATH = path.join(__dirname, '..', 'public', 'representatives-rankings.json');
const API_KEY = process.env.CONGRESS_API_KEY;
const CONGRESS = 119;

// House bill/resolution types (Congress.gov canonical slugs)
const TYPES = ['hr', 'hres', 'hconres', 'hjres'];

// --- Utilities ---------------------------------------------------------------

function ensureLegislationShape(rep) {
  rep.sponsoredBills = rep.sponsoredBills || 0;
  rep.cosponsoredBills = rep.cosponsoredBills || 0;
  rep.sponsoredAmendments = rep.sponsoredAmendments || 0;
  rep.cosponsoredAmendments = rep.cosponsoredAmendments || 0;
  rep.becameLawBills = rep.becameLawBills || 0;
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

function becamePublicLawFromLatestAction(latestAction) {
  const a = (latestAction?.action || '').toLowerCase();
  return a.includes('became public law') || a.includes('public law');
}

function increment(repMap, id, field) {
  if (!id || !repMap.has(id)) return false;
  repMap.get(id)[field]++;
  return true;
}

// --- Main -------------------------------------------------------------------

(async function main() {
  try {
    if (!API_KEY) {
      console.error('Missing CONGRESS_API_KEY');
      process.exit(1);
    }

    const reps = JSON.parse(fs.readFileSync(OUT_PATH, 'utf-8')).map(ensureLegislationShape);
    const repMap = new Map(reps.map(r => [r.bioguideId, r]));

    let attached = 0;
    let lawsAttachedBills = 0;
    let lawsAttachedAmendsSponsor = 0;
    let lawsAttachedAmendsCosponsor = 0;

    // 1) Bills + resolutions (House-origin types)
    for (const type of TYPES) {
      const listUrl = `https://api.congress.gov/v3/bill/${CONGRESS}/${type}?api_key=${API_KEY}&format=json&pageSize=250&offset=0`;
      const bills = await fetchAllPages(listUrl);

      for (const b of bills) {
        const bill = await fetchBillDetail(b.url);
        if (!bill) continue;

        // Sponsors
        const sponsors = normalizePeople(bill.sponsors);
        for (const s of sponsors) {
          if (increment(repMap, s.bioguideId, 'sponsoredBills')) attached++;
        }

        // Cosponsors: inline items + full list via URL
        const inlineCosponsors = bill.cosponsors?.items || [];
        for (const c of inlineCosponsors) {
          if (increment(repMap, c.bioguideId, 'cosponsoredBills')) attached++;
        }

        if (bill.cosponsors?.url) {
          const cosponsorPages = await fetchAllPages(`${bill.cosponsors.url}&api_key=${API_KEY}&format=json`);
          for (const c of cosponsorPages) {
            if (increment(repMap, c.bioguideId, 'cosponsoredBills')) attached++;
          }
        }

        // Became law (bill/resolution)
        if (becamePublicLawFromLatestAction(bill.latestAction)) {
          for (const s of sponsors) {
            if (increment(repMap, s.bioguideId, 'becameLawBills')) lawsAttachedBills++;
          }
        }
      }
    }

    // 2) Amendments (House-origin only)
    // Paginate all amendments for the Congress, then filter by chamber === 'House'
    const amdListUrl = `https://api.congress.gov/v3/amendment/${CONGRESS}?api_key=${API_KEY}&format=json&pageSize=250&offset=0`;
    const amendments = await fetchAllPages(amdListUrl);

    for (const a of amendments) {
      const amd = await fetchAmendmentDetail(a.url);
      if (!amd) continue;
      if ((amd.chamber || '').toLowerCase() !== 'house') continue;

      // Sponsors
      const sponsors = normalizePeople(amd.sponsors);
      for (const s of sponsors) {
        if (increment(repMap, s.bioguideId, 'sponsoredAmendments')) attached++;
      }

      // Cosponsors: inline items + full list via URL
      const inlineCosponsors = amd.cosponsors?.items || [];
      for (const c of inlineCosponsors) {
        if (increment(repMap, c.bioguideId, 'cosponsoredAmendments')) attached++;
      }

      if (amd.cosponsors?.url) {
        const cosponsorPages = await fetchAllPages(`${amd.cosponsors.url}&api_key=${API_KEY}&format=json`);
        for (const c of cosponsorPages) {
          if (increment(repMap, c.bioguideId, 'cosponsoredAmendments')) attached++;
        }
      }

      // Became law (amendment)
      if (becamePublicLawFromLatestAction(amd.latestAction)) {
        for (const s of sponsors) {
          if (increment(repMap, s.bioguideId, 'becameLawAmendments')) lawsAttachedAmendsSponsor++;
        }
        for (const c of inlineCosponsors) {
          if (increment(repMap, c.bioguideId, 'becameLawCosponsoredAmendments')) lawsAttachedAmendsCosponsor++;
        }
        // If cosponsors list URL exists, count those as well
        if (amd.cosponsors?.url) {
          const cosponsorPages = await fetchAllPages(`${amd.cosponsors.url}&api_key=${API_KEY}&format=json`);
          for (const c of cosponsorPages) {
            if (increment(repMap, c.bioguideId, 'becameLawCosponsoredAmendments')) lawsAttachedAmendsCosponsor++;
          }
        }
      }
    }

    fs.writeFileSync(OUT_PATH, JSON.stringify(reps, null, 2));
    console.log(
      `Updated representatives-rankings.json with legislation + amendments: ` +
      `${attached} sponsor/cosponsor entries; ` +
      `became law — bills: ${lawsAttachedBills}, amendments (sponsor): ${lawsAttachedAmendsSponsor}, amendments (cosponsor): ${lawsAttachedAmendsCosponsor}`
    );
  } catch (err) {
    console.error('Legislation scraper failed:', err.message);
    process.exit(1);
  }
})();
