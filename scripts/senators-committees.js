// scripts/senators-committees.js
const fs = require('fs');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

const OUTPUT = 'public/senators-rankings.json';
const base = JSON.parse(fs.readFileSync(OUTPUT, 'utf8'));

const COMMITTEE_URLS = [
  'https://www.agriculture.senate.gov/about/members',
  'https://www.appropriations.senate.gov/about/members',
  'https://www.armed-services.senate.gov/about/members',
  'https://www.banking.senate.gov/about/members',
  'https://www.budget.senate.gov/committee-members',
  'https://www.commerce.senate.gov/about/members',
  'https://www.energy.senate.gov/about/members',
  'https://www.epw.senate.gov/public/index.cfm/members',
  'https://www.finance.senate.gov/about/members',
  'https://www.foreign.senate.gov/about/members',
  'https://www.help.senate.gov/about/members',
  'https://www.hsgac.senate.gov/about/members',
  'https://www.indian.senate.gov/about/members',
  'https://www.judiciary.senate.gov/about/members',
  'https://www.rules.senate.gov/about/members',
  'https://www.sbc.senate.gov/about/members',
  'https://www.veterans.senate.gov/about/members',
  'https://www.aging.senate.gov/about/members',
  'https://www.ethics.senate.gov/public/index.cfm/members',
  'https://www.intelligence.senate.gov/about/members'
];

function normalizeName(n) {
  return String(n).toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ').trim();
}

function roleFromText(t) {
  const s = t.toLowerCase();
  if (s.includes('chair')) return 'Chair';
  if (s.includes('ranking')) return 'Ranking';
  return 'Member';
}

async function fetchPage(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return await res.text();
}

async function scrapeCommittee(url, committeeName) {
  const html = await fetchPage(url);
  const $ = cheerio.load(html);

  const textBlocks = $('*').contents().map(function () {
    return this.type === 'text' ? $(this).text().trim() : '';
  }).get().filter(Boolean);

  textBlocks.forEach(t => {
    const role = roleFromText(t);
    const m = t.match(/Senator\s+([A-Za-z.\- ]+)/i);
    if (m) {
      const name = m[1].trim();
      const sen = base.find(s => normalizeName(s.name).includes(normalizeName(name.split(' ').pop())));
      if (sen) {
        if (!sen.committees) sen.committees = [];
        sen.committees.push({ committee: committeeName, role });
      }
    }
  });
}

async function main() {
  for (const url of COMMITTEE_URLS) {
    const committeeName = url.split('/')[2]; // crude name
    try {
      await scrapeCommittee(url, committeeName);
      console.log(`Scraped ${committeeName}`);
    } catch (e) {
      console.error(`Failed ${committeeName}: ${e.message}`);
    }
  }

  fs.writeFileSync(OUTPUT, JSON.stringify(base, null, 2));
  console.log('senators-rankings.json updated with committees.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
