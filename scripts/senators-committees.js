// scripts/senators-committees.js
const fs = require('fs');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

const OUTPUT = 'public/senators-rankings.json';
const base = JSON.parse(fs.readFileSync(OUTPUT, 'utf8'));

// Official committee membership pages (top-level committees only)
const COMMITTEE_PAGES = [
  { committee: 'Agriculture, Nutrition, and Forestry', url: 'https://www.agriculture.senate.gov/about/members' },
  { committee: 'Appropriations', url: 'https://www.appropriations.senate.gov/subcommittees' }, // membership listed per sub; we’ll treat top-level as Member unless leadership detected
  { committee: 'Armed Services', url: 'https://www.armed-services.senate.gov/about/members' },
  { committee: 'Banking, Housing, and Urban Affairs', url: 'https://www.banking.senate.gov/about/members' },
  { committee: 'Budget', url: 'https://www.budget.senate.gov/committee-members' },
  { committee: 'Commerce, Science, and Transportation', url: 'https://www.commerce.senate.gov/about/members' },
  { committee: 'Energy and Natural Resources', url: 'https://www.energy.senate.gov/about/members' },
  { committee: 'Environment and Public Works', url: 'https://www.epw.senate.gov/public/index.cfm/members' },
  { committee: 'Finance', url: 'https://www.finance.senate.gov/about/members' },
  { committee: 'Foreign Relations', url: 'https://www.foreign.senate.gov/about/members' },
  { committee: 'Health, Education, Labor, and Pensions', url: 'https://www.help.senate.gov/about/members' },
  { committee: 'Homeland Security and Governmental Affairs', url: 'https://www.hsgac.senate.gov/about/members' },
  { committee: 'Indian Affairs', url: 'https://www.indian.senate.gov/about/members' },
  { committee: 'Judiciary', url: 'https://www.judiciary.senate.gov/about/members' },
  { committee: 'Rules and Administration', url: 'https://www.rules.senate.gov/about/members' },
  { committee: 'Small Business and Entrepreneurship', url: 'https://www.sbc.senate.gov/about/members' },
  { committee: 'Veterans’ Affairs', url: 'https://www.veterans.senate.gov/about/members' },
  { committee: 'Special Committee on Aging', url: 'https://www.aging.senate.gov/about/members' },
  { committee: 'Select Committee on Ethics', url: 'https://www.ethics.senate.gov/public/index.cfm/members' },
  { committee: 'Select Committee on Intelligence', url: 'https://www.intelligence.senate.gov/about/members' }
];

function normalizeName(n) {
  return String(n).toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ').trim();
}

const byFullName = new Map(base.map(s => [normalizeName(s.name), s]));
const byLastName = new Map(base.map(s => [normalizeName(s.name.split(' ').pop()), s]));

function roleFromText(t) {
  const s = t.toLowerCase();
  if (s.includes('chair')) return 'Chair';
  if (s.includes('ranking')) return 'Ranking';
  return 'Member';
}

async function fetchPage(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return await res.text();
}

function addCommitteeAssignment(senator, committee, role) {
  if (!senator.committees) senator.committees = [];
  // Avoid duplicates
  if (!senator.committees.find(c => c.committee === committee)) {
    senator.committees.push({ committee, role });
  } else {
    // Upgrade role if leadership detected
    const entry = senator.committees.find(c => c.committee === committee);
    if (entry && (role === 'Chair' || role === 'Ranking')) entry.role = role;
  }
}

async function scrapeCommittee({ committee, url }) {
  const html = await fetchPage(url);
  const $ = cheerio.load(html);

  // Heuristic: look for member blocks with names and possible role labels
  const textBlocks = $('*').contents().filter(function () {
    return this.type === 'text' && /\S/.test(this.data);
  }).map(function () { return $(this).text().trim(); }).get();

  // Collect potential "Name — Role" pairs
  const candidates = [];
  textBlocks.forEach(t => {
    // Common patterns: "Senator First Last", "Chairman First Last", "Ranking Member First Last"
    const m1 = t.match(/(Chair|Chairman|Ranking(?:\sMember)?)\s+([A-Za-z.\- ]+)/i);
    const m2 = t.match(/Senator\s+([A-Za-z.\- ]+)/i);
    if (m1) {
      candidates.push({ name: m1[2].trim(), role: roleFromText(m1[1]) });
    } else if (m2) {
      candidates.push({ name: m2[1].trim(), role: 'Member' });
    }
  });

  // Fallback: parse list items and table cells for names
  $('li, td, p, a').each((i, el) => {
    const txt = $(el).text().trim();
    const m = txt.match(/([A-Za-z.\- ]+),?\s*(Chair|Chairman|Ranking(?:\sMember)?)/i);
    if (m) candidates.push({ name: m[1].trim(), role: roleFromText(m[2]) });
    else {
      const mSen = txt.match(/^Senator\s+([A-Za-z.\- ]+)/i);
      if (mSen) candidates.push({ name: mSen[1].trim(), role: 'Member' });
    }
  });

  // Deduplicate and attach to senators
  const seen = new Set();
  candidates.forEach(({ name, role }) => {
    const norm = normalizeName(name);
    if (seen.has(norm)) return;
    seen.add(norm);

    let sen = byFullName.get(norm);
    if (!sen) {
      const last = normalizeName(name.split(' ').pop());
      sen = byLastName.get(last);
    }
    if (sen) addCommitteeAssignment(sen, committee, role);
  });
}

async function main() {
  // Initialize committees arrays
  base.forEach(s => { s.committees = s.committees || []; });

  for (const c of COMMITTEE_PAGES) {
    try {
      await scrapeCommittee(c);
      console.log(`Scraped committee: ${c.committee}`);
    } catch (e) {
      console.error(`Failed committee ${c.committee}: ${e.message}`);
    }
  }

  fs.writeFileSync(OUTPUT, JSON.stringify(base, null, 2));
  console.log('senators-rankings.json updated with committees (Member/Ranking/Chair).');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
