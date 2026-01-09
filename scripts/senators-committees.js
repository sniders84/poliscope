const fs = require('fs');
const cheerio = require('cheerio');
const fetch = require('node-fetch');

const COMMITTEES = require('./committees-config.json'); // Ensure this has correct .name and .url for each committee

async function scrapeCommittee(committee) {
  console.log(`Scraping ${committee.name} from ${committee.url}`);
  const res = await fetch(committee.url);
  if (!res.ok) {
    console.log(`Failed ${committee.name}: ${res.status}`);
    return [];
  }
  const html = await res.text();
  const $ = cheerio.load(html);

  // Try multiple common selectors
  const selectors = [
    '.committee-members li',
    '.members-list li',
    '.member-list li',
    'ul li.member',
    'div.member-info',
    'li' // broad fallback
  ];

  let members = [];
  for (const sel of selectors) {
    $(sel).each((i, el) => {
      const text = $(el).text().trim();
      if (!text) return;

      // Look for senator-like text
      if (!/senator/i.test(text) && !/^[A-Z][a-z]+,/.test(text)) return;

      const role = detectRole(text);
      const name = cleanName(text);
      if (name.length > 3) {
        members.push({ name, committee: committee.name, role });
      }
    });
    if (members.length > 0) break;
  }

  // Dedupe & prioritize roles
  const byName = new Map();
  members.forEach(m => {
    const existing = byName.get(m.name);
    const rolePriority = rolePriorityNum(m.role);
    const existingPriority = existing ? rolePriorityNum(existing.role) : -1;
    if (rolePriority > existingPriority) {
      byName.set(m.name, m);
    }
  });

  console.log(`Found ${byName.size} members for ${committee.name}`);
  return Array.from(byName.values());
}

function cleanName(text) {
  return text
    .replace(/\s*\(.*?\)\s*/g, '') // strip (R-AL)
    .replace(/Senator\s*/i, '')
    .replace(/\s*\(Chairman|Chair|Ranking Member|Vice Chair\)\s*/gi, '')
    .trim();
}

function detectRole(text) {
  text = text.toLowerCase();
  if (text.includes('chairman') || text.includes('chair')) return 'Chairman';
  if (text.includes('ranking member') || text.includes('ranking')) return 'Ranking Member';
  if (text.includes('vice chair')) return 'Vice Chair';
  return 'Member';
}

function rolePriorityNum(role) {
  const pri = { 'Chairman': 4, 'Vice Chair': 3, 'Ranking Member': 2, 'Member': 1 };
  return pri[role] || 0;
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

  // Sort committees by role priority
  Object.values(senators).forEach(s => {
    s.committees.sort((a, b) => rolePriorityNum(b.role) - rolePriorityNum(a.role));
  });

  fs.writeFileSync('public/senators-committees.json', JSON.stringify(Object.values(senators), null, 2));
  console.log('senators-committees.json updated!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
