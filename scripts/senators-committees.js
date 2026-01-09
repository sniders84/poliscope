// scripts/senators-committees.js
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

// Helpers to normalize text and detect roles
function cleanName(text) {
  return text
    .replace(/\s+/g, ' ')
    .replace(/Senator\s+/i, '')
    .replace(/\b(U\.S\.\s+Senator|United States Senator)\b/i, '')
    .replace(/\b(D-|R-|I-)[A-Z]{2}\b/g, '') // strip party-state suffix if present
    .replace(/\(.*?\)/g, '') // strip parentheses notes
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

  // Strategy: look for common membership containers and list items
  const containers = [
    '.member', '.committee-member', '.members', '.membership',
    '.member-list', '.committee-members', '.content', '.main-content'
  ];

  // Collect candidate elements
  let candidates = $(containers.join(', '));
  if (candidates.length === 0) {
    // Fallback to list items
    candidates = $('li');
  }

  candidates.each((i, el) => {
    const text = $(el).text().trim();
    if (!text) return;

    // Only consider lines that include “Senator” or look like “Last, First”
    const looksLikeSenator =
      /Senator/i.test(text) ||
      /^[A-Z][a-z]+,\s+[A-Z][a-z]+/.test(text);

    if (!looksLikeSenator) return;

    const role = detectRole(text);
    const name = cleanName(text);

    // Filter out obvious non-names
    if (!name || name.length < 3) return;
    if (/About the Committee|United States Senate/i.test(name)) return;

    members.push({ name, committee: committee.name, role });
  });

  // De-duplicate by name+role
  const seen = new Set();
  const unique = members.filter(m => {
    const key = `${m.name}|${m.role}|${m.committee}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return unique;
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
