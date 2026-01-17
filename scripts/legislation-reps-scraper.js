// scripts/legislation-reps-scraper.js
// Pull sponsored/cosponsored counts for House from GovTrack bulk data (119th Congress)
// Enriches representatives-rankings.json seeded by bootstrap

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const RANKINGS_PATH = path.join(__dirname, '../public/representatives-rankings.json');
// GovTrack bulk bills endpoint (JSON index of all bills in 119th Congress)
const GOVTRACK_BILLS_URL = 'https://www.govtrack.us/api/v2/bill?congress=119&limit=1000';

async function fetchAllBills() {
  let bills = [];
  let nextUrl = GOVTRACK_BILLS_URL;

  while (nextUrl) {
    const res = await fetch(nextUrl);
    if (!res.ok) throw new Error(`GovTrack fetch failed: ${res.status}`);
    const data = await res.json();
    bills = bills.concat(data.objects);
    nextUrl = data.meta.next; // pagination
  }
  return bills;
}

async function scrapeHouseLegislation() {
  console.log(`Fetching GovTrack bills for 119th Congress...`);

  let rankings;
  try {
    rankings = JSON.parse(fs.readFileSync(RANKINGS_PATH, 'utf8'));
  } catch (err) {
    console.error('Failed to load representatives-rankings.json:', err.message);
    return;
  }

  // Initialize tallies
  const tallies = {};
  rankings.forEach(r => {
    tallies[r.bioguideId] = {
      sponsoredBills: 0,
      cosponsoredBills: 0,
      becameLawBills: 0,
      becameLawCosponsoredBills: 0,
      sponsoredAmendments: 0,
      cosponsoredAmendments: 0,
      becameLawAmendments: 0,
      becameLawCosponsoredAmendments: 0
    };
  });

  try {
    const bills = await fetchAllBills();
    console.log(`Processing ${bills.length} bills from GovTrack...`);

    for (const bill of bills) {
      const sponsorId = bill.sponsor?.bioguide_id;
      const cosponsors = bill.cosponsors || [];
      const enacted = bill.enacted || false;
      const isAmendment = bill.bill_type === 'amendment';

      // Sponsored
      if (sponsorId && tallies[sponsorId]) {
        if (isAmendment) tallies[sponsorId].sponsoredAmendments++;
        else tallies[sponsorId].sponsoredBills++;
        if (enacted) {
          if (isAmendment) tallies[sponsorId].becameLawAmendments++;
          else tallies[sponsorId].becameLawBills++;
        }
      }

      // Cosponsored
      for (const c of cosponsors) {
        const cid = c.bioguide_id;
        if (cid && tallies[cid]) {
          if (isAmendment) tallies[cid].cosponsoredAmendments++;
          else tallies[cid].cosponsoredBills++;
          if (enacted) {
            if (isAmendment) tallies[cid].becameLawCosponsoredAmendments++;
            else tallies[cid].becameLawCosponsoredBills++;
          }
        }
      }
    }

    // Merge tallies back into rankings
    rankings.forEach(r => {
      const t = tallies[r.bioguideId];
      if (t) {
        r.sponsoredBills = t.sponsoredBills;
        r.cosponsoredBills = t.cosponsoredBills;
        r.becameLawBills = t.becameLawBills;
        r.becameLawCosponsoredBills = t.becameLawCosponsoredBills;
        r.sponsoredAmendments = t.sponsoredAmendments;
        r.cosponsoredAmendments = t.cosponsoredAmendments;
        r.becameLawAmendments = t.becameLawAmendments;
        r.becameLawCosponsoredAmendments = t.becameLawCosponsoredAmendments;
      }
    });

    fs.writeFileSync(RANKINGS_PATH, JSON.stringify(rankings, null, 2));
    console.log(`House legislation updated for ${rankings.length} representatives`);

  } catch (err) {
    console.error('GovTrack scrape error:', err.message);
  }
}

scrapeHouseLegislation();
