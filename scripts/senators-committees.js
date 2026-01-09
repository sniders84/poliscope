const fs = require('fs');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

const COMMITTEES = require('./committees-config.json'); // Your config file with url + name

function cleanName(text) {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\s*\(.*?\)\s*/g, '') // strip (R-AL)
    .trim();
}

function detectRole(text) {
  text = text.toLowerCase();
  if (text.includes('chairman') || text.includes('chair')) return 'Chairman';
  if (text.includes('ranking member') || text.includes('ranking')) return 'Ranking Member';
  if (text.includes('vice chair')) return 'Vice Chair';
  return 'Member';
}

async function scrapeCommittee(committee) {
  const res = await fetch(committee.url);
  if (!res.ok) {
    console.log(`Failed to fetch ${committee.name}: ${res.status}`);
    return [];
  }
  const html = await res.text();
  const $ = cheerio.load(html);

  // Try multiple selectors - senate.gov uses inconsistent classes
  const selectors = [
    '.committee-members li',
    '.members-list li',
    '.member-list li',
    'ul li', // Fallback
    'div.member' // Sometimes divs
  ];

  let members = [];
  for (const sel of selectors) {
    $(sel).each((i, el) => {
      let text = $(el).text().trim();
      if (!text || !/senator/i.test(text) && !/^[A-Z][a-z]+,/.test(text)) return;

      const role = detectRole(text);
      const name = cleanName(text);
      if (name && name.length > 3) {
        members.push({ name, committee: committee.name, role });
      }
    });
    if (members.length > 0) break; // Stop if we found some
  }

  // Dedupe by name, prefer higher role
  const byName = new Map();
  members.forEach(m => {
    const existing = byName.get(m.name);
    if (!existing || ['Chairman', 'Vice Chair', 'Ranking Member'].includes(m.role)) {
      byName.set(m.name, m);
    }
  });

  console.log(`Found ${byName.size} members for ${committee.name}`);
  return Array.from(byName.values());
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

  // Sort committees by role priority if desired
  Object.values(senators).forEach(s => {
    s.committees.sort((a, b) => {
      const priority = { 'Chairman': 3, 'Vice Chair': 2, 'Ranking Member': 1, 'Member': 0 };
      return (priority[b.role] || 0) - (priority[a.role] || 0);
    });
  });

  fs.writeFileSync('public/senators-committees.json', JSON.stringify(Object.values(senators), null, 2));
  console.log('senators-committees.json fully updated!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
