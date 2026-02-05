// scripts/legislation-scraper.js
//
// Purpose: Pull sponsored/cosponsored bills and became-law counts *only for the 119th Congress* (Senate)
// Source: Congress.gov API v3 — uses bioguideId directly
// Output: public/legislation-senators.json

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const API_KEY = process.env.CONGRESS_API_KEY;
const BASE_URL = 'https://api.congress.gov/v3';

const legislatorsPath = path.join(__dirname, '../public/legislators-current.json');
const outputPath = path.join(__dirname, '../public/legislation-senators.json');

const legislators = JSON.parse(fs.readFileSync(legislatorsPath, 'utf-8'));

async function getWithRetry(url, tries = 5) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      const resp = await axios.get(url);
      return resp.data;
    } catch (err) {
      lastErr = err;
      console.warn(`Retry ${i+1}/${tries} for ${url}: ${err.message}`);
      await new Promise(r => setTimeout(r, 3000 * (i + 1)));
    }
  }
  throw lastErr;
}

async function fetchBills(bioguideId) {
  let sponsored = 0, cosponsored = 0, becameLawSponsored = 0, becameLawCosponsored = 0;

  // Sponsored bills
  let next = `${BASE_URL}/member/${bioguideId}/sponsored-legislation?congress=119&api_key=${API_KEY}&format=json`;
  while (next) {
    const data = await getWithRetry(next);
    const bills = data.sponsoredLegislation || [];
    if (bills.length === 0) break;

    for (const bill of bills) {
      sponsored++;
      if (bill.latestAction?.action?.toLowerCase().includes('became law')) {
        becameLawSponsored++;
      }
    }
    next = data.pagination?.next;
  }

  // Cosponsored bills
  next = `${BASE_URL}/member/${bioguideId}/cosponsored-legislation?congress=119&api_key=${API_KEY}&format=json`;
  while (next) {
    const data = await getWithRetry(next);
    const bills = data.cosponsoredLegislation || [];
    if (bills.length === 0) break;

    for (const bill of bills) {
      cosponsored++;
      if (bill.latestAction?.action?.toLowerCase().includes('became law')) {
        becameLawCosponsored++;
      }
    }
    next = data.pagination?.next;
  }

  return { sponsored, cosponsored, becameLawSponsored, becameLawCosponsored };
}

(async () => {
  const results = [];

  for (const leg of legislators) {
    const lastTerm = leg.terms?.[leg.terms.length - 1];
    if (!lastTerm || lastTerm.type !== 'sen') continue;  // filter to senators

    const bioguideId = leg.id?.bioguide;
    if (!bioguideId) continue;

    const name = `${leg.name.first} ${leg.name.last}`;
    const state = lastTerm.state || '';
    const party = lastTerm.party || '';

    console.log(`\nProcessing ${name} (${bioguideId}, ${state})...`);

    try {
      const totals = await fetchBills(bioguideId);

      results.push({
        bioguideId,
        name,
        state,
        party,
        sponsoredBills: totals.sponsored,
        cosponsoredBills: totals.cosponsored,
        becameLawBills: totals.becameLawSponsored,
        becameLawCosponsoredBills: totals.becameLawCosponsored
      });

      console.log(`${name}: sponsored=${totals.sponsored}, cosponsored=${totals.cosponsored}, becameLawBills=${totals.becameLawSponsored}, becameLawCosponsoredBills=${totals.becameLawCosponsored}`);
    } catch (err) {
      console.error(`Error for ${bioguideId} (${name}): ${err.message}`);
    }
