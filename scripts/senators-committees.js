const fs = require('fs');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

const COMMITTEES = require('./committees-config.json');

function cleanName(text) {
  return text
    .replace(/Sen\.?\s*/gi, '')
    .replace(/\s*\([RD]-[A-Z]{2}\)\s*/gi, '') // strip (R-AL)
    .replace(/\s*Chairman|Chairwoman|Ranking Member|Vice Chair\s*/gi, '')
    .replace(/\s+/g, ' ')
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
  console.log(`Scraping ${committee.name || 'unnamed'} from ${committee.url}`);
  try {
    const res = await fetch(committee.url);
    if (!res.ok) {
      console.log(`Failed ${committee.name}: ${res.status}`);
      return [];
    }
    const html = await res.text();
    const $ = cheerio.load(html);

    // Expanded selectors for senate.gov variations
    const selectors = [
      'li.member', '.member-list li', '.committee-members li', '.members-list li',
      'table tr td:first-child', 'div.member-info', 'ul li a', 'p strong', 'li'
    ];

    let members = [];
    for (const sel of selectors) {
      $(sel).each((i, el) => {
        // Get text from element or its link
        let text = $(el).text().trim();
        if ($(el).find('a').length) text = $(el).find('a').text().trim() || text;

        if (!text || text.length < 5) return;

        // Filter senator-like text
        if (!/^[A-Z][a-z]+/.test(text) && !/senator/i.test(text)) return;

        const role = detectRole(text + $(el).html()); // include html for bold/italic roles
        const name = cleanName(text);

        if (name && name.split(' ').length >= 2) { // at least first + last
          members.push({ name, committee: committee.name, role });
        }
      });
      if (members.length > 5) break; // good enough
    }

    // Dedupe, prioritize higher roles
    const byName = new Map();
    members.forEach(m => {
      const existing = byName.get(m.name);
      const pri = { 'Chairman': 4, 'Vice Chair': 3, 'Ranking Member': 2, 'Member': 1 }[m.role] || 0;
      const exPri = existing ? { 'Chairman': 4, 'Vice Chair': 3, 'Ranking Member': 2, 'Member': 1 }[existing.role] || 0 : 0;
      if (pri > exPri) byName.set(m.name, m);
    });

    console.log(`Found ${byName.size} members for ${committee.name}`);
    return Array.from(byName.values());
  } catch (err) {
    console.log(`Error scraping ${committee.name}: ${err.message}`);
    return [];
  }
}

async function main() {
  const senators = {};
  for (const committee of COMMITTEES) {
    if (!committee.url || !committee.name) {
      console.log('Skipping invalid committee entry');
      continue;
    }
    const members = await scrapeCommittee(committee);
    for (const m of members) {
      if (!senators[m.name]) senators[m.name] = { name: m.name, committees: [] };
      senators[m.name].committees.push({ committee: m.committee, role: m.role });
    }
  }

  // Sort committees by role priority
  Object.values(senators).forEach(s => {
    s.committees.sort((a, b) => {
      const pri = { 'Chairman': 4, 'Vice Chair': 3, 'Ranking Member': 2, 'Member': 1 };
      return (pri[b.role] || 0) - (pri[a.role] || 0);
    });
  });

  fs.writeFileSync('public/senators-committees.json', JSON.stringify(Object.values(senators), null, 2));
  console.log(`senators-committees.json updated! Total senators: ${Object.keys(senators).length}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
