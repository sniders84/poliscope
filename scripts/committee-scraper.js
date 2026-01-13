// committee-scraper.js
// Scrapes Senate committee membership using committees-config.json as reference
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
    const match = text.match(/Senator\s+([A-Z][A-Za-z\.\-'\s]+)/i) ||
                  text.match(/^([A-Z][A-Za-z\.\-'\s]+)\s+\([A-Z]{2}\)/);
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
  const committees = JSON.parse(fs.readFileSync('scripts/committees-config.json', 'utf8'));
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
