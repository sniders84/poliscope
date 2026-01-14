/**
 * Congress.gov legislation scraper (cloud-only, Senate-only)
 * - Aggregates sponsor/cosponsor counts for bills, resolutions, joint resolutions, concurrent resolutions, amendments
 * - "Became law" applies only to bills and joint resolutions
 * - Outputs public/senators-legislation.json
 *
 * Env:
 *   CONGRESS_GOV_API_KEY (required)
 *   CONGRESS_NUMBER (defaults to 119)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = process.env.CONGRESS_GOV_API_KEY;
const CONGRESS = process.env.CONGRESS_NUMBER || '119';
const OUT_PATH = path.join('public', 'senators-legislation.json');

if (!API_KEY) throw new Error('Missing CONGRESS_GOV_API_KEY env.');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function getJson(url, retries = 3, backoffMs = 500) {
  return new Promise((resolve, reject) => {
    const attempt = (n) => {
      https.get(url, (res) => {
        let data = '';
        res.on('data', (c) => data += c);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try { resolve(JSON.parse(data)); }
            catch (e) { reject(new Error(`JSON parse error: ${e.message}`)); }
          } else if (n < retries) {
            setTimeout(() => attempt(n + 1), backoffMs * (n + 1));
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 200)}`));
          }
        });
      }).on('error', (err) => {
        if (n < retries) setTimeout(() => attempt(n + 1), backoffMs * (n + 1));
        else reject(err);
      });
    };
    attempt(0);
  });
}

async function fetchAllPages(baseUrl) {
  const results = [];
  let page = 1;
  while (true) {
    const url = `${baseUrl}&page=${page}`;
    const json = await getJson(url);
    const items = json?.data || json?.bills || json?.amendments || [];
    results.push(...items);

    const pages = json?.pagination?.pages || 1;
    const current = json?.pagination?.page || page;
    if (current >= pages) break;
    page++;
    await sleep(200);
  }
  return results;
}

// Congress.gov typically provides bioguideId on sponsor/cosponsor member objects
function bioguide(member) {
  return member?.bioguideId || member?.bioguide_id || null;
}

// Bill type classification (Senate)
function classifyBill(bill) {
  const t = (bill?.billType || bill?.type || '').toUpperCase();
  if (t === 'S') return 'BILL';
  if (t === 'S.RES.' || t === 'S.RES') return 'RESOLUTION';
  if (t === 'S.J.RES.' || t === 'S.J.RES') return 'JOINT_RESOLUTION';
  if (t === 'S.CON.RES.' || t === 'S.CON.RES') return 'CONCURRENT_RESOLUTION';
  // Fallback: inspect number prefixes if available
  const num = (bill?.number || '').toUpperCase();
  if (num.startsWith('S.J.RES')) return 'JOINT_RESOLUTION';
  if (num.startsWith('S.CON.RES')) return 'CONCURRENT_RESOLUTION';
  if (num.startsWith('S.RES')) return 'RESOLUTION';
  if (num.startsWith('S')) return 'BILL';
  return 'UNKNOWN';
}

// Amendments are separate; classify as AMENDMENT
function classifyAmendment() { return 'AMENDMENT'; }

// Became law detection—only for bills and joint resolutions
function becameLawForBill(bill) {
  const la = bill?.latestAction?.text?.toLowerCase?.() || '';
  if (la.includes('became public law') || la.includes('enacted')) return true;
  if (Array.isArray(bill?.laws) && bill.laws.length > 0) return true;
  return false;
}

// Initialize full schema counters
function initTotals() {
  return {
    sponsoredBills: 0,
    cosponsoredBills: 0,
    sponsoredBillBecameLaw: 0,
    cosponsoredBillBecameLaw: 0,

    sponsoredAmendment: 0,
    cosponsoredAmendment: 0,

    sponsoredResolution: 0,
    cosponsoredResolution: 0,

    sponsoredJointResolution: 0,
    cosponsoredJointResolution: 0,
    sponsoredJointResolutionBecameLaw: 0,
    cosponsoredJointResolutionBecameLaw: 0,

    sponsoredConcurrentResolution: 0,
    cosponsoredConcurrentResolution: 0,
  };
}

async function run() {
  console.log(`Congress.gov aggregation: Congress=${CONGRESS}, chamber=Senate`);

  // Bills/resolutions (Senate)
  const billsBase = `https://api.congress.gov/v3/bill?format=json&congress=${CONGRESS}&chamber=Senate&api_key=${API_KEY}`;
  const bills = await fetchAllPages(billsBase);
  console.log(`Fetched Senate bills/resolutions: ${bills.length}`);

  // Amendments (Senate)
  const amdtBase = `https://api.congress.gov/v3/amendment?format=json&congress=${CONGRESS}&chamber=Senate&api_key=${API_KEY}`;
  const amendments = await fetchAllPages(amdtBase);
  console.log(`Fetched Senate amendments: ${amendments.length}`);

  const totals = new Map();
  const ensure = (id) => {
    if (!totals.has(id)) totals.set(id, initTotals());
    return totals.get(id);
  };

  // Process bills/resolutions
  for (const bill of bills) {
    const kind = classifyBill(bill);
    const sponsorId = bioguide(bill?.sponsor);
    const cosponsors = Array.isArray(bill?.cosponsors) ? bill.cosponsors : [];
    const enacted = becameLawForBill(bill);

    // Sponsor
    if (sponsorId) {
      const t = ensure(sponsorId);
      if (kind === 'BILL') {
        t.sponsoredBills++;
        if (enacted) t.sponsoredBillBecameLaw++;
      } else if (kind === 'RESOLUTION') {
        t.sponsoredResolution++;
      } else if (kind === 'JOINT_RESOLUTION') {
        t.sponsoredJointResolution++;
        if (enacted) t.sponsoredJointResolutionBecameLaw++;
      } else if (kind === 'CONCURRENT_RESOLUTION') {
        t.sponsoredConcurrentResolution++;
      }
    }

    // Cosponsors
    for (const c of cosponsors) {
      const cid = bioguide(c?.member || c);
      if (!cid) continue;
      const t = ensure(cid);
      if (kind === 'BILL') {
        t.cosponsoredBills++;
        if (enacted) t.cosponsoredBillBecameLaw++;
      } else if (kind === 'RESOLUTION') {
        t.cosponsoredResolution++;
      } else if (kind === 'JOINT_RESOLUTION') {
        t.cosponsoredJointResolution++;
        if (enacted) t.cosponsoredJointResolutionBecameLaw++;
      } else if (kind === 'CONCURRENT_RESOLUTION') {
        t.cosponsoredConcurrentResolution++;
      }
    }
  }

  // Process amendments (no “became law”)
  for (const amdt of amendments) {
    const sponsorId = bioguide(amdt?.sponsor);
    const cosponsors = Array.isArray(amdt?.cosponsors) ? amdt.cosponsors : [];

    if (sponsorId) {
      const t = ensure(sponsorId);
      t.sponsoredAmendment++;
    }
    for (const c of cosponsors) {
      const cid = bioguide(c?.member || c);
      if (!cid) continue;
      const t = ensure(cid);
      t.cosponsoredAmendment++;
    }
  }

  const results = Array.from(totals.entries()).map(([bioguideId, t]) => ({ bioguideId, ...t }));

  // Ensure public/ exists
  const publicDir = path.join('public');
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

  fs.writeFileSync(OUT_PATH, JSON.stringify(results, null, 2));
  console.log(`Wrote ${OUT_PATH} with ${results.length} senator entries.`);
}

run().catch((err) => {
  console.error('Scraper failed:', err);
  process.exit(1);
});
