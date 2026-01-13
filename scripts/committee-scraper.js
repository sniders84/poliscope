// committee-scraper.js
// Scrapes Senate.gov committee membership pages
// Outputs public/senators-committees.json

const fs = require('fs');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

async function scrapeCommittee(url, committeeName) {
  const res = await fetch(url);
  const html = await res.text();
  const $ = cheerio.load(html);

  const members = [];

  $('table tr, li').each((i, row) => {
    const text = $(row).text().trim();
    if (!text) return;

    let role = "Member";
    if (/Chair/i.test(text)) role = "Chair";
    if (/Ranking/i.test(text)) role = "Ranking";

    members.push({ name: text, committee: committeeName, role });
  });

  return members;
}

async function run() {
  const legislators = JSON.parse(fs.readFileSync('public/legislators-current.json', 'utf8'));
  const senators = legislators.filter(l => l.terms.some(t => t.type === 'sen'));
  const committeeConfig = JSON.parse(fs.readFileSync('scripts/committees-config.json', 'utf8'));

  const committeeData = {};

  for (const { name, url } of committeeConfig) {
    const members = await scrapeCommittee(url, name);
    for (const m of members) {
      const sen = senators.find(s => s.name.official_full.includes(m.name));
      if (!sen) continue;
      const bioguideId = sen.id.bioguide;

      if (!committeeData[bioguideId]) committeeData[bioguideId] = [];
      committeeData[bioguideId].push({ name, role: m.role });
    }
  }

  const output = senators.map(sen => ({
    bioguideId: sen.id.bioguide,
    committees: committeeData[sen.id.bioguide] || []
  }));

  fs.writeFileSync('public/senators-committees.json', JSON.stringify(output, null, 2));
  console.log('Committee scraper complete!');
}

run().catch(err => console.error(err));
