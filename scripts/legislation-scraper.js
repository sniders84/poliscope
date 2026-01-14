/**
 * Legislation scraper (Senate-only, Congress.gov API)
 * - Aggregates sponsor/cosponsor counts for bills, resolutions, joint resolutions, concurrent resolutions, amendments
 * - "Became law" applies only to bills and joint resolutions
 * - Outputs public/senators-legislation.json
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = process.env.CONGRESS_GOV_API_KEY;
const CONGRESS = process.env.CONGRESS_NUMBER || '119';
const OUT_PATH = path.join('public', 'senators-legislation.json');

if (!API_KEY) throw new Error('Missing CONGRESS_GOV_API_KEY env.');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function getJson(url) { return new Promise((resolve, reject) => {
  https.get(url, res => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
      try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
    });
  }).on('error', reject);
}); }

async function fetchAllPages(baseUrl) {
  const results = [];
  let page = 1;
  while (true) {
    const url = `${baseUrl}&page=${page}`;
    const json = await getJson(url);
    const items = json?.data || [];
    results.push(...items);
    if (page >= (json?.pagination?.pages || 1)) break;
    page++; await sleep(200);
  }
  return results;
}

function bioguide(m) { return m?.bioguideId || null; }
function classifyBill(b) {
  const t = (b?.billType || '').toUpperCase();
  if (t === 'S') return 'BILL';
  if (t.includes('S.RES')) return 'RESOLUTION';
  if (t.includes('S.J.RES')) return 'JOINT_RESOLUTION';
  if (t.includes('S.CON.RES')) return 'CONCURRENT_RESOLUTION';
  return 'UNKNOWN';
}
function becameLaw(b) {
  const la = b?.latestAction?.text?.toLowerCase?.() || '';
  return la.includes('became public law') || la.includes('enacted') || (Array.isArray(b?.laws) && b.laws.length > 0);
}

function initTotals() {
  return {
    sponsoredBills:0, cosponsoredBills:0,
    sponsoredBillBecameLaw:0, cosponsoredBillBecameLaw:0,
    sponsoredAmendment:0, cosponsoredAmendment:0,
    sponsoredResolution:0, cosponsoredResolution:0,
    sponsoredJointResolution:0, cosponsoredJointResolution:0,
    sponsoredJointResolutionBecameLaw:0, cosponsoredJointResolutionBecameLaw:0,
    sponsoredConcurrentResolution:0, cosponsoredConcurrentResolution:0
  };
}

async function run() {
  console.log(`Legislation scraper: Congress=${CONGRESS}, chamber=Senate`);
  const bills = await fetchAllPages(`https://api.congress.gov/v3/bill?format=json&congress=${CONGRESS}&chamber=Senate&api_key=${API_KEY}`);
  const amendments = await fetchAllPages(`https://api.congress.gov/v3/amendment?format=json&congress=${CONGRESS}&chamber=Senate&api_key=${API_KEY}`);

  const totals = new Map();
  const ensure = id => { if (!totals.has(id)) totals.set(id, initTotals()); return totals.get(id); };

  for (const bill of bills) {
    const kind = classifyBill(bill);
    const sponsorId = bioguide(bill?.sponsor);
    const cosponsors = Array.isArray(bill?.cosponsors) ? bill.cosponsors : [];
    const enacted = becameLaw(bill);

    if (sponsorId) {
      const t = ensure(sponsorId);
      if (kind==='BILL'){t.sponsoredBills++; if(enacted)t.sponsoredBillBecameLaw++;}
      else if(kind==='RESOLUTION'){t.sponsoredResolution++;}
      else if(kind==='JOINT_RESOLUTION'){t.sponsoredJointResolution++; if(enacted)t.sponsoredJointResolutionBecameLaw++;}
      else if(kind==='CONCURRENT_RESOLUTION'){t.sponsoredConcurrentResolution++;}
    }
    for (const c of cosponsors) {
      const cid = bioguide(c?.member||c); if(!cid)continue;
      const t = ensure(cid);
      if (kind==='BILL'){t.cosponsoredBills++; if(enacted)t.cosponsoredBillBecameLaw++;}
      else if(kind==='RESOLUTION'){t.cosponsoredResolution++;}
      else if(kind==='JOINT_RESOLUTION'){t.cosponsoredJointResolution++; if(enacted)t.cosponsoredJointResolutionBecameLaw++;}
      else if(kind==='CONCURRENT_RESOLUTION'){t.cosponsoredConcurrentResolution++;}
    }
  }

  for (const amdt of amendments) {
    const sponsorId = bioguide(amdt?.sponsor);
    const cosponsors = Array.isArray(amdt?.cosponsors)?amdt.cosponsors:[];
    if(sponsorId){ensure(sponsorId).sponsoredAmendment++;}
    for(const c of cosponsors){const cid=bioguide(c?.member||c);if(cid)ensure(cid).cosponsoredAmendment++;}
  }

  const results = Array.from(totals.entries()).map(([id,t])=>({bioguideId:id,...t}));
  fs.writeFileSync(OUT_PATH, JSON.stringify(results,null,2));
  console.log(`Wrote ${OUT_PATH} with ${results.length} senator entries.`);
}
run().catch(e=>{console.error('Legislation scraper failed:',e);process.exit(1);});
