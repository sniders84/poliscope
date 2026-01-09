const fs = require('fs');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

const COMMITTEES = require('./committees-config.json'); // keep your URLs in committees-config.json

function cleanName(text) {
  return text
    .replace(/\s+/g, ' ')
    .replace(/Senator\s+/i, '')
    .replace(/\(.*?\)/g, '') // strip party/state
    .replace(/Chairman|Chairwoman|Ranking Member/gi, '')
    .trim();
}

function detectRole(text) {
  if (/Ranking Member/i.test(text)) return 'Ranking Member';
  if (/Chairman|Chairwoman/i.test(text)) return 'Chairman';
  return 'Member';
}

async function scrapeCommittee(committee) {
  const res = await fetch(committee.url);
  const html = await res.text();
  const $ = cheerio.load(html);

  const members = [];
  $('li, .member, .committee-member').each((i, el) => {
    const text = $(el).text().trim();
    if (!text) return;
    if (!/Senator/i.test(text) && !/^[A-Z][a-z]+,\s+[A-Z]/.test(text)) return;

    const role = detectRole(text);
    const name = cleanName(text);
    if (name) members.push({ name, committee: committee.name, role });
  });

  return members;
}

async function main() {
  const senators = {};
  for (const committee of COMMITTEES) {
    const members = await scrapeCommittee(committee);
    for (const m of members) {
      if (!senators[m.name]) senators[m.name] = { name: m.name, committees: [] };
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
