// votes-scraper.js
// Scrapes Senate roll call votes (119th Congress sessions 1 & 2)
// Outputs public/senators-votes.json

const fs = require('fs');
const fetch = require('node-fetch');
const { XMLParser } = require('fast-xml-parser');

const INDEXES = [
  'https://www.senate.gov/legislative/LIS/roll_call_votes/vote119/vote_menu_119_1.xml',
  'https://www.senate.gov/legislative/LIS/roll_call_votes/vote119/vote_menu_119_2.xml',
];

const legislators = JSON.parse(fs.readFileSync('public/legislators-current.json', 'utf8'));
const senators = legislators.filter(l => l.terms.some(t => t.type === 'sen'));
const byBioguide = new Map(senators.map(s => [s.id.bioguide, s]));
const byLis = new Map(senators.map(s => [s.id.lis, s]));

async function get(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

function parseXML(xml) {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });
  return parser.parse(xml);
}

function
