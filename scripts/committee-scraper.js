// committee-scraper.js
// Scrapes Senate committee pages for membership (119th Congress)
// Outputs public/senators-committees.json

const fs = require('fs');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

const legislators = JSON.parse(fs.readFileSync('public/legislators-current.json', 'utf8'));
const senators = legislators.filter(l => l.terms.some(t => t.type === 'sen'));
const byName = new Map(senators.map(s => [normalize(s.name.official_full), s]));

function normalize(name) {
  return name.replace(/\s+/g, ' ').replace(/[,]+/g, '').trim().toLowerCase();
}

async function get(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

async function scrapeCommittee(url, name) {
  const html = await get(url);
  const $ = cheerio.load(html);
  const members = [];

  $('li, p, td').each((_, el) => {
    const text = $(el).text().trim();
    if (!text) return;
    const match = text.match(/Senator\s+([A-Z][A-Za-z\.\-'\s]+)/i);
    if (match) {
      const norm = normalize(match[1]);
      const sen = byName.get(norm);
      if (sen) {
        members.push({ bioguideId: sen.id.bioguide, committee: name });
      }
    }
  });

  return members;
}

async function run() {
  const committees = [
    { name: 'Agriculture, Nutrition, and Forestry', url: 'https://www.agriculture.senate.gov/about/membership' },
    { name: 'Appropriations', url: 'https://www.appropriations.senate.gov/about/members' },
    { name: 'Armed Services', url: 'https://www.armed-services.senate.gov/about/members' },
    { name: 'Banking, Housing, and Urban Affairs', url: 'https://www.banking.senate.gov/about/members' },
    { name: 'Budget', url: 'https://www.budget.senate.gov/about/members' },
    { name: 'Commerce, Science, and Transportation', url: 'https://www.commerce.senate.gov/about/members' },
    { name: 'Energy and Natural Resources', url: 'https://www.energy.senate.gov/about/members' },
    { name: 'Environment and Public Works', url: 'https://www.epw.senate.gov/about/members' },
    { name: 'Finance', url: 'https://www.finance.senate.gov/about/members' },
    { name: 'Foreign Relations', url: 'https://www.foreign.senate.gov/about/members' },
    { name: 'Health, Education, Labor, and Pensions', url: 'https://www.help.senate.gov/about/members' },
    { name: 'Homeland Security and Governmental Affairs', url: 'https://www.hsgac.senate.gov/about/members' },
    { name: 'Judiciary', url: 'https://www.judiciary.senate.gov/about/members' },
    { name: 'Rules and Administration', url: 'https://www.rules.senate.gov/about/members' },
    { name: 'Small Business and Entrepreneurship', url: 'https://www.sbc.senate.gov/about/members' },
    { name: 'Veterans\' Affairs', url: 'https://www.veterans.senate.gov/about/members' },
    { name: 'Intelligence', url: 'https://www.intelligence.senate.gov/about/members' },
  ];

  const senatorCommittees = new Map();

  for (const c of committees) {
    try {
      const members = await scrapeCommittee(c.url, c.name);
      for (const m of members) {
        if (!senatorCommittees.has(m.bioguideId)) {
          senatorCommittees.set(m.bioguideId, []);
        }
        senatorCommittees.get(m.bioguideId).push(c.name);
      }
    } catch (err) {
      console.error(`Error scraping ${c.name}: ${err.message}`);
    }
  }

  const results = [];
  for (const [bioguideId, comms] of senatorCommittees.entries()) {
    results.push({ bioguideId, committees: comms });
  }

  fs.writeFileSync('public/senators-committees.json', JSON.stringify(results, null, 2));
  console.log('Committee scraper complete!');
}

run().catch(err => console.error(err));
