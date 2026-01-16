// scripts/legislation-senators-scraper.js
// Purpose: Scrape Senate legislation (bills + resolutions + amendments) for the 119th Congress
// Enriches senators-rankings.json with sponsor/cosponsor counts and became-law tallies

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const OUT_PATH = path.join(__dirname, '..', 'public', 'senators-rankings.json');
const API_KEY = process.env.CONGRESS_API_KEY;
const CONGRESS = 119;

// Senate bill/resolution types
const TYPES = ['s', 'sres', 'sconres', 'sjres'];

function ensureShape(sen) {
  sen.sponsoredBills = sen.sponsoredBills || 0;
  sen.cosponsoredBills = sen.cosponsoredBills || 0;
  sen.becameLawBills = sen.becameLawBills || 0;
  sen.becameLawCosponsoredBills = sen.becameLawCosponsoredBills || 0;
  sen.sponsoredAmendments = sen.sponsoredAmendments || 0;
  sen.cosponsoredAmendments = sen.cosponsoredAmendments || 0;
  sen.becameLawAmendments = sen.becameLawAmendments || 0;
  sen.becameLawCosponsoredAmendments = sen.becameLawCosponsoredAmendments || 0;
  return sen;
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

    const sens = JSON.parse(fs.readFileSync(OUT_PATH, 'utf-8')).map(ensureShape);
    const senMap = new Map(sens.map(r => [r.bioguideId, r]));

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
          if (inc(senMap, s.bioguideId, 'sponsoredBills')) attached++;
        }

        // Cosponsors (inline)
        for (const c of inlineCosponsors) {
          if (inc(senMap, c.bioguideId, 'cosponsoredBills')) attached++;
        }

        // Cosponsors (list URL)
        if (bill.cosponsors?.url) {
          const cosponsorPages = await fetchAllPages(`${bill.cosponsors.url}&api_key=${API_KEY}&format=json`);
          for (const c of cosponsorPages) {
            if (inc(senMap, c.bioguideId, 'cosponsoredBills')) attached++;
          }
        }

        // Became law
        if (becamePublicLaw(bill.latestAction)) {
          for (const s of sponsors) {
            if (inc(senMap, s.bioguideId, 'becameLawBills')) lawsBillsSponsor++;
          }
          for (const c of inlineCosponsors) {
            if (inc(senMap, c.bioguideId, 'becameLawCosponsoredBills')) lawsBillsCosponsor++;
          }
          if (bill.cosponsors?.url) {
            const cosponsorPages = await fetchAllPages(`${bill.cosponsors.url}&api_key=${API_KEY}&format=json`);
            for (const c of cosponsorPages) {
              if (inc(senMap, c.bioguideId, 'becameLawCosponsoredBills')) lawsBillsCosponsor++;
            }
          }
        }
      }
    }

    // Amendments (Senate-origin only)
    const amdListUrl = `https://api.congress.gov/v3/amendment/${CONGRESS}?api_key=${API_KEY}&format=json&pageSize=250&offset=0`;
    const amendments = await fetchAllPages(amdListUrl);

    for (const a of amendments) {
      const amd = await fetchAmendmentDetail(a.url);
      if (!amd) continue;
      if ((amd.chamber || '').toLowerCase() !== 'senate') continue;

      const sponsors = normalizePeople(amd.sponsors);
      const inlineCosponsors = amd.cosponsors?.items || [];

      for (const s of sponsors) {
        if (inc(senMap, s.bioguideId, 'sponsoredAmendments')) attached++;
      }
      for (const c of inlineCosponsors) {
        if (inc(senMap, c.bioguideId, 'cosponsoredAmendments')) attached++;
      }
      if (amd.cosponsors?.url) {
        const cosponsorPages = await fetchAllPages(`${amd.cosponsors.url}&api_key=${API_KEY}&format=json`);
        for (const c of cosponsorPages) {
          if (inc(senMap, c.bioguideId, 'cosponsoredAmendments')) attached++;
        }
      }

      if (becamePublicLaw(amd.latestAction)) {
        for (const s of sponsors) {
          if (inc(senMap, s.bioguideId, 'becameLawAmendments')) lawsAmendsSponsor++;
        }
        for (const c of inlineCosponsors) {
          if (inc(senMap, c.bioguideId, 'becameLawCosponsoredAmendments')) lawsAmendsCosponsor++;
        }
        if (amd.cosponsors?.url) {
          const cosponsorPages = await fetchAllPages(`${amd.cosponsors.url}&api_key=${API_KEY}&format=json`);
          for (const c of cosponsorPages) {
            if (inc(senMap, c.bioguideId, 'becameLawCosponsoredAmendments')) lawsAmendsCosponsor++;
          }
        }
      }
    }

    fs.writeFileSync(OUT_PATH, JSON.stringify(sens, null, 2));
    console.log(
      `Updated senators-rankings.json with legislation + amendments: ` +
      `${attached} sponsor/cosponsor entries; ` +
      `became law — bills (sponsor): ${lawsBillsSponsor}, bills (cosponsor): ${lawsBillsCosponsor}, ` +
      `amendments (sponsor): ${lawsAmendsSponsor}, amendments (cosponsor): ${lawsAmendsCosponsor}`
    );

        // Optional: log top counts per senator for sanity check
    sens.slice(0,5).forEach(s => {
      console.log(`${s.name}: sponsoredBills=${s.sponsoredBills}, cosponsoredBills=${s.cosponsoredBills}`);
    });
  } catch (err) {
    console.error('Senate legislation scraper failed:', err.message);
    process.exit(1);
  }
})();

