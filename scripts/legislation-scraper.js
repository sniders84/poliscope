// scripts/legislation-scraper.js
//
// Career totals for sponsored, cosponsored, becameLawSponsored, becameLawCosponsored
// Source: Congress.gov API (preferred) with HTML fallback.
// Output: public/legislation-senators.json

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const API_KEY = process.env.CONGRESS_API_KEY;
const BASE_URL = 'https://api.congress.gov/v3';

const legislatorsPath = path.join(__dirname, '../public/legislators-current.json');
const outputPath = path.join(__dirname, '../public/legislation-senators.json');

const legislators = JSON.parse(fs.readFileSync(legislatorsPath, 'utf-8'));

// Helper: fetch with retries
async function getWithRetry(url, params = {}, tries = 3) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      const resp = await axios.get(url, { params });
      return resp.data;
    } catch (err) {
      lastErr = err;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw lastErr;
}

// Step 1: resolve Congress.gov memberId from bioguide via API
async function resolveMemberId(bioguideId) {
  const url = `${BASE_URL}/member`;
  const data = await getWithRetry(url, { api_key: API_KEY, format: 'json', bioguideId });
  if (data.members && data.members.length > 0) {
    // Prefer current senator record
    const current = data.members.find(m => (m.role || '').toLowerCase().includes('senator')) || data.members[0];
    return current.memberId;
  }
  return null;
}

// Step 2: fetch career totals via API if available
async function fetchCareerTotalsAPI(memberId) {
  // Congress.gov exposes member details; some deployments include summary stats
  const url = `${BASE_URL}/member/${memberId}`;
  const data = await getWithRetry(url, { api_key: API_KEY, format: 'json' });

  // Try common fields; if absent, return null to trigger HTML fallback
  const stats = data.member && data.member.statistics ? data.member.statistics : null;
  if (!stats) return null;

  return {
    sponsored: Number(stats.billsSponsored ?? 0),
    cosponsored: Number(stats.billsCosponsored ?? 0),
    becameLawSponsored: Number(stats.billsSponsoredBecameLaw ?? 0),
    becameLawCosponsored: Number(stats.billsCosponsoredBecameLaw ?? 0),
  };
}

// Step 3: HTML fallback—parse career totals from member profile page
async function fetchCareerTotalsHTML(memberId) {
  const url = `https://www.congress.gov/member/${memberId}`;
  const html = await getWithRetry(url, {}, 3);

  function extract(regex) {
    const m = html.match(regex);
    return m ? Number(m[1]) : 0;
  }

  // Regexes target common labels on the profile page
  const sponsored = extract(/Sponsored Bills:\s*<\/span>\s*<span[^>]*>(\d+)/i);
  const cosponsored = extract(/Cosponsored Bills:\s*<\/span>\s*<span[^>]*>(\d+)/i);
  const becameLawSponsored = extract(/Sponsored Bills that Became Law:\s*<\/span>\s*<span[^>]*>(\d+)/i);
  const becameLawCosponsored = extract(/Cosponsored Bills that Became Law:\s*<\/span>\s*<span[^>]*>(\d+)/i);

  return { sponsored, cosponsored, becameLawSponsored, becameLawCosponsored };
}

(async () => {
  const results = [];

  for (const leg of legislators) {
    const bioguideId = leg.id?.bioguide;
    if (!bioguideId) continue;

    const name = `${leg.name.first} ${leg.name.last}`;
    const state = leg.terms?.[leg.terms.length - 1]?.state || '';
    const party = leg.terms?.[leg.terms.length - 1]?.party || '';

    try {
      const memberId = await resolveMemberId(bioguideId);
      if (!memberId) {
        console.warn(`No Congress.gov memberId for ${bioguideId} (${name}) — skipping`);
        continue;
      }

      let totals = await fetchCareerTotalsAPI(memberId);
      if (!totals) {
        totals = await fetchCareerTotalsHTML(memberId);
      }

      results.push({
        bioguideId,
        name,
        state,
        party,
        sponsored: totals.sponsored,
        cosponsored: totals.cosponsored,
        becameLawSponsored: totals.becameLawSponsored,
        becameLawCosponsored: totals.becameLawCosponsored,
      });

      console.log(
        `${name}: sponsored=${totals.sponsored}, cosponsored=${totals.cosponsored}, ` +
        `becameLawSponsored=${totals.becameLawSponsored}, becameLawCosponsored=${totals.becameLawCosponsored}`
      );
    } catch (err) {
      console.error(`Error for ${bioguideId} (${name}): ${err.message}`);
    }
  }

  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`Wrote ${results.length} senator records to ${outputPath}`);
})();
