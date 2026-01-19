// scripts/legislation-representatives-scraper.js
//
// Purpose: Pull sponsored/cosponsored bills and became-law counts for 119th Congress (House)
// Source: Congress.gov API v3 — resolve bioguideId → memberId, then fetch sponsored/cosponsored
// Output: public/legislation-representatives.json

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const API_KEY = process.env.CONGRESS_API_KEY;
const BASE_URL = 'https://api.congress.gov/v3';

const legislatorsPath = path.join(__dirname, '../public/legislators-current.json');
const outputPath = path.join(__dirname, '../public/legislation-representatives.json');

const legislators = JSON.parse(fs.readFileSync(legislatorsPath, 'utf-8'));

async function getWithRetry(url, params = {}, tries = 5) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      const fullParams = { api_key: API_KEY, format: 'json', ...params };
      const resp = await axios.get(url, { params: fullParams });
      return resp.data;
    } catch (err) {
      lastErr = err;
      console.warn(`Retry ${i+1}/${tries} for ${url} (params: ${JSON.stringify(params)}): ${err.message}${err.response ? ` - ${err.response.status}` : ''}`);
      await new Promise(r => setTimeout(r, 2000 * (i + 1))); // stronger backoff
    }
  }
  throw lastErr || new Error('All retries failed');
}

async function resolveMemberId(bioguideId) {
  const url = `${BASE_URL}/member`;
  const params = {
    bioguideId,
    currentMember: true,  // crucial for active reps
    congress: 119,
    limit: 1
  };

  try {
    const data = await getWithRetry(url, params);
    console.log(`Resolve response for ${bioguideId}:`, JSON.stringify(data, null, 2).slice(0, 500)); // truncated

    if (data.members && data.members.length > 0) {
      const member = data.members[0];
      if (member.memberId) {
        console.log(`Success: ${bioguideId} → memberId ${member.memberId}`);
        return member.memberId;
      }
    }
    console.warn(`No valid memberId found for ${bioguideId}`);
  } catch (err) {
    console.error(`Resolve failed for ${bioguideId}: ${err.message}`);
  }

  // Fallback: try without currentMember or congress filters
  try {
    const fallbackParams = { bioguideId, limit: 1 };
    const data = await getWithRetry(url, fallbackParams);
    if (data.members && data.members.length > 0 && data.members[0].memberId) {
      return data.members[0].memberId;
    }
  } catch {}

  return null;
}

async function fetchBills(memberId) {
  let sponsored = 0, cosponsored = 0, becameLawSponsored = 0, becameLawCosponsored = 0;
  const limit = 250;

  // Sponsored
  let offset = 0;
  while (true) {
    const params = { congress: 119, limit, offset };
    const url = `${BASE_URL}/member/${memberId}/sponsored-legislation`;
    const data = await getWithRetry(url, params);
    const bills = data.sponsoredLegislation || [];
    if (bills.length === 0) break;

    for (const bill of bills) {
      sponsored++;
      const actionLower = (bill.latestAction?.action || '').toLowerCase();
      const textLower = (bill.latestAction?.text || '').toLowerCase();
      if (actionLower.includes('became law') || textLower.includes('became public law') ||
          textLower.includes('signed by president') || actionLower.includes('public law')) {
        becameLawSponsored++;
      }
    }
    offset += limit;
  }

  // Cosponsored (same logic)
  offset = 0;
  while (true) {
    const params = { congress: 119, limit, offset };
    const url = `${BASE_URL}/member/${memberId}/cosponsored-legislation`;
    const data = await getWithRetry(url, params);
    const bills = data.cosponsoredLegislation || [];
    if (bills.length === 0) break;

    for (const bill of bills) {
      cosponsored++;
      const actionLower = (bill.latestAction?.action || '').toLowerCase();
      const textLower = (bill.latestAction?.text || '').toLowerCase();
      if (actionLower.includes('became law') || textLower.includes('became public law') ||
          textLower.includes('signed by president') || actionLower.includes('public law')) {
        becameLawCosponsored++;
      }
    }
    offset += limit;
  }

  return { sponsored, cosponsored, becameLawSponsored, becameLawCosponsored };
}

(async () => {
  const results = [];

  for (const leg of legislators) {
    const lastTerm = leg.terms?.[leg.terms.length - 1];
    if (!lastTerm || lastTerm.type !== 'rep') continue;

    const bioguideId = leg.id?.bioguide;
    if (!bioguideId) continue;

    const name = `${leg.name.first} ${leg.name.last}`;
    const state = lastTerm.state || '';
    const district = lastTerm.district || '';
    const party = lastTerm.party || '';

    console.log(`\nProcessing ${name} (${bioguideId})...`);

    try {
      const memberId = await resolveMemberId(bioguideId);
      if (!memberId) {
        console.warn(`Skipping ${name} — no memberId found`);
        continue;
      }

      const totals = await fetchBills(memberId);

      results.push({
        bioguideId,
        memberId,  // optional: add for debugging
        name,
        state,
        district,
        party,
        sponsoredBills: totals.sponsored,
        cosponsoredBills: totals.cosponsored,
        becameLawBills: totals.becameLawSponsored,
        becameLawCosponsoredBills: totals.becameLawCosponsored
      });

      console.log(
        `${name}: sponsored=${totals.sponsored}, cosponsored=${totals.cosponsored}, ` +
        `becameLaw=${totals.becameLawSponsored}, becameLawCosponsored=${totals.becameLawCosponsored}`
      );

      await new Promise(r => setTimeout(r, 2000)); // 2s delay to avoid throttling
    } catch (err) {
      console.error(`Error for ${bioguideId} (${name}): ${err.message}`);
    }
  }

  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\nWrote ${results.length} representative records to ${outputPath}`);
})();
