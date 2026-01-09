const fs = require('fs');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

const COMMITTEES = [
  { name: "Agriculture, Nutrition, and Forestry", url: "https://www.agriculture.senate.gov/about/membership" },
  { name: "Appropriations", url: "https://www.appropriations.senate.gov/about/members" },
  { name: "Armed Services", url: "https://www.armed-services.senate.gov/about/members" },
  { name: "Banking, Housing, and Urban Affairs", url: "https://www.banking.senate.gov/about/membership" },
  { name: "Budget", url: "https://www.budget.senate.gov/about/members" },
  { name: "Commerce, Science, and Transportation", url: "https://www.commerce.senate.gov/about/membership" },
  { name: "Energy and Natural Resources", url: "https://www.energy.senate.gov/about/membership" },
  { name: "Environment and Public Works", url: "https://www.epw.senate.gov/about/membership" },
  { name: "Finance", url: "https://www.finance.senate.gov/about/membership" },
  { name: "Foreign Relations", url: "https://www.foreign.senate.gov/about/membership" },
  { name: "Health, Education, Labor, and Pensions", url: "https://www.help.senate.gov/about/membership" },
  { name: "Homeland Security and Governmental Affairs", url: "https://www.hsgac.senate.gov/about/membership" },
  { name: "Judiciary", url: "https://www.judiciary.senate.gov/about/members" },
  { name: "Rules and Administration", url: "https://www.rules.senate.gov/about/membership" },
  { name: "Small Business and Entrepreneurship", url: "https://www.sbc.senate.gov/about/membership" },
  { name: "Veterans' Affairs", url: "https://www.veterans.senate.gov/about/membership" }
];

async function scrapeCommittee(committee) {
  const res = await fetch(committee.url);
  const html = await res.text();
  const $ = cheerio.load(html);

  const members = [];
  $('.member, .committee-member, li').each((i, el) => {
    const text = $(el).text().trim();
    if (text && /Senator/i.test(text)) {
      let role = 'Member';
      if (/Chairman|Chairwoman/i.test(text)) role = 'Chairman';
      if (/Ranking Member/i.test(text)) role = 'Ranking Member';
      const name = text.replace(/Senator\s+/i, '')
                       .replace(/Chairman|Chairwoman|Ranking Member/i, '')
                       .trim();
      if (name) {
        members.push({ name, committee: committee.name, role });
      }
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
