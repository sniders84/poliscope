// scripts/legislation-representatives-scraper.js
//
// Purpose: Update sponsored/cosponsored bills and became-law counts
// for the 119th Congress (House) directly in representatives-rankings.json
// Split mode: accepts part argument (1–4) to divide 440 reps into slices

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const API_KEY = process.env.CONGRESS_API_KEY;
const BASE_URL = 'https://api.congress.gov/v3';

const legislatorsPath = path.join(__dirname, '../public/legislators-current.json');
const rankingsPath = path.join(__dirname, '../public/representatives-rankings.json');

const legislators = JSON.parse(fs.readFileSync(legislatorsPath, 'utf-8'));
let rankings = [];
if (fs.existsSync(rankingsPath)) {
  rankings = JSON.parse(fs.readFileSync(rankingsPath, 'utf-8'));
}

// Accept part argument (1–4)
const partArg = parseInt(process.argv[2], 10);
const sliceSize = Math.ceil(440 / 4);
const startIndex = (partArg - 1) * sliceSize;
const endIndex = startIndex + sliceSize;
const slice = legislators.slice(startIndex, endIndex);

console.log(`Running House legislation scraper part ${partArg}: reps ${startIndex}–${endIndex - 1}`);

async function getWithRetry(url, params = {}, tries = 5) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      const fullParams = { api_key: API_KEY, format: 'json', ...params };
      const resp = await axios.get(url, { params: fullParams });
      return resp.data;
    } catch (err) {
      lastErr = err;
      const status = err.response?.status || 'unknown';
      console.warn(`Retry ${i+1}/${tries} for ${url} - status ${status}: ${err.message}`);
      await new Promise(r => setTimeout(r, status === 429 ? 10000 : 3000 * (i + 1)));
    }
  }
  throw lastErr || new Error(`All retries failed for ${url}`);
}

function is119th(bill) {
  const cong = bill.congress;
  if (cong === 119 || cong === '119') return true;
  if (bill.introducedDate && bill.introducedDate >= '2025-01-03' && bill.introducedDate < '2027-01-01') {
    return true;
  }
  return false;
}

function isBecameLaw(bill) {
  const action = (bill.latestAction?.action || '').toLowerCase();
  const text = (bill.latestAction?.text || '').toLowerCase();
  return /became (public )?law/.test(action) || /became (public )?law/.test(text) ||
         /signed by president/.test(text) || /enacted/.test(action) ||
         /public law no/i.test(text);
}

async function fetchBills(bioguideId) {
  let sponsored = 0, cosponsored = 0, becameLawSponsored = 0, becameLawCosponsored = 0;
  const limit = 250;
  const maxPages = 50;

  async function paginate(endpoint) {
    let count = 0;
    let lawCount = 0;
    let offset = 0;
    let totalPagesProcessed = 0;

    while (true) {
      if (totalPagesProcessed >= maxPages) break;

      const url = `${BASE_URL}/member/${bioguideId}/${endpoint}`;
      const params = { congress: 119, limit, offset };
      let data;
      try {
        data = await getWithRetry(url, params);
      } catch (err) {
        console.error(`Pagination error for ${endpoint} at offset ${offset}: ${err.message}`);
        break;
      }

      const billsKey = endpoint === 'sponsored-legislation' ? 'sponsoredLegislation' : 'cosponsoredLegislation
