// votes-scraper.js
// Scrapes Senate roll call votes for ALL sessions of the 119th Congress
// Outputs public/senators-votes.json

const fs = require('fs');
const fetch = require('node-fetch');
const { XMLParser } = require('fast-xml-parser');

const legislators = JSON.parse(fs.readFileSync('public/legislators-current.json', 'utf8'));
const senators = legislators.filter(l => l.terms.some(t => t.type === 'sen'));

const BASE_URL = 'https://www.senate.gov/legislative/LIS/roll_call_votes/vote119';

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });

async function fetchXML(url) {
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`Failed to fetch ${url}: ${res.status}`);
    return null;
  }
  const text = await res.text();
  try {
    return parser.parse(text);
  } catch (err) {
    console.error(`XML parse error for ${url}: ${err.message}`);
    return null;
  }
}

async function scrapeVotes() {
  const sessions = [1, 2];
  const voteRecords = {};

  for (const session of
