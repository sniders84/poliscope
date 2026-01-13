// votes-scraper.js
// Scrapes Senate roll call XML index
// Outputs public/senators-votes.json

const fs = require('fs');
const fetch = require('node-fetch');
const xml2js = require('xml2js');

const INDEX_URL = 'https://www.senate.gov/legislative/LIS/roll_call_votes/vote119/vote_menu.xml';

async function fetchIndex() {
  const res = await fetch(INDEX_URL);
  if (!res.ok) {
    console.error(`Index fetch error: ${res.status} ${res.statusText}`);
    return null;
  }
  const xml = await res.text();
  return xml2js.parseStringPromise(xml, { strict: false });
}

async function fetchRollCall(url) {
  const res = await fetch(url);
  if (!res.ok) return null;
  const xml = await res.text();

  const safeXml = xml
    .replace(/&(?!(amp|lt|gt|quot|apos);)/g, '&amp;')
    .replace(/<\s+/g, '&lt; ');

  try {
    return xml2js.parseStringPromise(safeXml, { strict: false });
  } catch (err) {
    console.error(`Failed to parse roll call: ${err.message}`);
    return null;
  }
}

async function scrapeVotes() {
  const legislators = JSON.parse(fs.readFileSync('public/legislators-current.json', 'utf8'));
  const senators = legislators.filter(l => l.terms.some(t => t.type === 'sen'));
  const voteData = {};

  const index = await fetchIndex();
  if (!index) return;

  const votes = index?.vote_menu?.vote || [];

  for (const v of votes) {
    const url = v.vote_url?.[0];
    if (!url) continue;

    const data = await fetchRollCall(url);
    if (!data) continue;

    const members = data.rollcall?.vote?.[0]?.members?.[0]?.member || [];
    for (const m of members) {
      const bioguideId = m.$?.member_id;
      const voteCast = m.vote?.[0] || '';

      if (!bioguideId) continue;

      if (!voteData[bioguideId]) {
        voteData[bioguideId] = { votesCast: 0, missedVotes: 0 };
      }

      if (/Not Voting/i.test(voteCast)) {
        voteData[bioguideId].missedVotes++;
      } else {
        voteData[bioguideId].votesCast++;
      }
    }
  }

  const output = senators.map(sen => {
    const bioguideId = sen.id.bioguide;
    const
