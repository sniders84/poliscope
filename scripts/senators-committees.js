const fs = require('fs');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

// Add committee URLs here (expand for all committees)
const COMMITTEES = [
  {
    name: "Agriculture, Nutrition, and Forestry",
    url: "https://www.agriculture.senate.gov/about/membership"
  },
  // { name: "Judiciary", url: "https://www.judiciary.senate.gov/about/members" },
  // Add more committees...
];

async function scrapeCommittee(committee) {
  const res = await fetch(committee.url);
  const html = await res.text();
  const $ = cheerio.load(html);

  const members = [];
  $('*').each((i, el) => {
    const text = $(el).text().trim();
    if (text && /Senator/i.test(text)) {
      let role = 'Member';
      if (/Chairman|Chairwoman/i.test(text)) role = 'Chairman';
      if (/Ranking Member/i.test(text)) role = 'Ranking Member';
      members.push({ name: text.replace(/Senator\s+/i, ''), committee: committee.name, role });
    }
  });
  return members;
}

async function main() {
  const senators = {};
  for (const committee of COMMITTEES) {
    const members = await scrapeCommittee(committee);
    for (const m of members) {
      if (!senators[m.name]) {
        senators[m.name] = { name: m.name, committees: [] };
      }
      senators[m.name].committees.push({ committee: m.committee, role: m.role });
    }
  }
  fs.writeFileSync('public/senators-committees.json', JSON.stringify(Object.values(senators), null, 2));
  console.log('senators-committees.json fully updated!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
