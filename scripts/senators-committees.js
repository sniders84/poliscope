const fs = require('fs');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

const COMMITTEES = require('./committees-config.json');

function cleanName(text) {
  return text
    .replace(/Sen\.?\s*/gi, '')
    .replace(/\s*\([RDIA]-[A-Z]{2}\)\s*/gi, '')
    .replace(/,\s*(Chairman|Ranking Member|Vice Chair|Member)\s*/gi, '')
    .replace(/\s*\(.*?\)\s*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectRole(text) {
  text = text.toLowerCase();
  if (/chairman|chair|chairwoman/.test(text)) return 'Chairman';
  if (/ranking member|ranking/.test(text)) return 'Ranking Member';
  if (/vice chair/.test(text)) return 'Vice Chair';
  return 'Member';
}

async function scrapeCommittee(committee) {
  console.log(`Scraping ${committee.name} from ${committee.url}`);
  try {
    const res = await fetch(committee.url);
    if (!res.ok) {
      console.log(`Failed ${committee.name}: ${res.status} - ${res.statusText}`);
      return [];
    }
    const html = await res.text();
    const $ = cheerio.load(html);

    // Priority selectors for known patterns
    const prioritySelectors = [
      'ul.member-list li', 'ul.members li', '.committee-members li', '.member-list li',
      'table.membership tr td:first-child', 'div.member-name', 'li a[href*="senator"]'
    ];

    let members = [];
    for (const sel of prioritySelectors) {
      $(sel).each((i, el) => {
        let text = $(el).text().trim();
        if ($(el).find('a').length) text = $(el).find('a').text().trim() || text;

        if (!text || text.length < 5) return;

        // Filter only senator-like entries
        if (!/^[A-Z][a-z]+/.test(text) && !/senator/i.test(text)) return;

        const role = detectRole(text + $(el).html());
        const name = cleanName(text);

        if (name.split(' ').length >= 2) { // First + last name
          members.push({ name, committee: committee.name, role });
        }
      });
      if (members.length >= 15) break; // Stop early if we hit typical committee size
    }

    // Dedupe with role priority
    const byName = new Map();
    const rolePriority = { 'Chairman': 4, 'Vice Chair': 3, 'Ranking Member': 2, 'Member': 1 };
    members.forEach(m => {
      const existing = byName.get(m.name);
      const pri = rolePriority[m.role] || 0;
      const exPri = existing ? rolePriority[existing.role] || 0 : 0;
      if (pri > exPri || !existing) {
        byName.set(m.name, m);
      }
    });

    const result = Array.from(byName.values());
    console.log(`Found ${result.length} members for ${committee.name}`);
    return result;
  } catch (err) {
    console.log(`Error scraping ${committee.name}: ${err.message}`);
    return [];
  }
}

async function main() {
  const senators = {};
  for (const committee of COMMITTEES) {
    if (!committee.url || !committee.name) {
      console.log('Skipping invalid entry');
      continue;
    }
    const members = await scrapeCommittee(committee);
    for (const m of members) {
      if (!senators[m.name]) senators[m.name] = { name: m.name, committees: [] };
      senators[m.name].committees.push({ committee: m.committee, role: m.role });
    }
  }

  // Sort by role priority
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
