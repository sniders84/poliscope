// committee-scraper.js
// Scrapes Senate.gov committee membership pages
// Outputs senators-committees.json

const fs = require('fs');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

const COMMITTEE_URLS = [
  // Add all committee URLs here (e.g., Energy, Foreign Relations, Judiciary, etc.)
  "https://www.senate.gov/committees/energy_and_natural_resources.htm",
  "https://www.senate.gov/committees/foreign_relations.htm"
  // ... full list of 119th Congress committees
];

async function scrapeCommittee(url) {
  const res = await fetch(url);
  const html = await res.text();
  const $ = cheerio.load(html);

  const committeeName = $('h1').first().text().trim();
  const members = [];

  $('table tr').each((i, row) => {
    const nameCell = $(row).find('td').first().text().trim();
    const roleCell = $(row).find('td').eq(1).text().trim();

    if (nameCell) {
      let role = "Member";
      if (/Chair/i.test(roleCell)) role = "Chair";
      if (/Ranking/i.test(roleCell)) role = "Ranking";

      members.push({ name: nameCell, committee: committeeName, role });
    }
  });

  return members;
}

async function run() {
  const senators = JSON.parse(fs.readFileSync('senators.json', 'utf8'));
  const committeeData = {};

  for (const url of COMMITTEE_URLS) {
    const members = await scrapeCommittee(url);
    for (const m of members) {
      const sen = senators.find(s => s.name.includes(m.name));
      if (!sen) continue;

      if (!committeeData[sen.bioguideId]) committeeData[sen.bioguideId] = [];
      committeeData[sen.bioguideId].push({ name: m.committee, role: m.role });
    }
  }

  const output = senators.map(sen => ({
    bioguideId: sen.bioguideId,
    committees: committeeData[sen.bioguideId] || []
  }));

  fs.writeFileSync('senators-committees.json', JSON.stringify(output, null, 2));
  console.log('Committee scraper complete!');
}

run().catch(err => console.error(err));
