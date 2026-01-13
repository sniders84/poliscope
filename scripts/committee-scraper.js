// committee-scraper.js
// Scrapes Senate committee membership pages defined in committees-config.json
// Outputs public/senators-committees.json

const fs = require('fs');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

const legislators = JSON.parse(fs.readFileSync('public/legislators-current.json', 'utf8'));
const senators = legislators.filter(l => l.terms.some(t => t.type === 'sen'));

// Load committee config (25 entries)
const committeesConfig = JSON.parse(fs.readFileSync('scripts/committees-config.json', 'utf8'));

function normalizeName(raw) {
  return raw
    .replace(/\s+/g, ' ')
    .replace(/\(.*?\)/g, '') // strip state/party markers
    .trim();
}

function findSenatorByName(name) {
  return senators.find(s => {
    const full = s.name.official_full.toLowerCase();
    return full.includes(name.toLowerCase().split(' ')[0]) &&
           full.includes(name.toLowerCase().split(' ').slice(-1)[0]);
  });
}

async function scrapeCommittee({ name, url }) {
  console.log(`Scraping committee: ${name}`);
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`Failed to fetch ${url}: ${res.status}`);
    return [];
  }
  const html = await res.text();
  const $ = cheerio.load(html);

  const members = [];

  // Try list-based markup
  $('li').each((_, el) => {
    const text = $(el).text().trim();
    if (text) {
      members.push(text);
    }
  });

  // Try table-based markup
  $('tr').each((_, el) => {
    const text = $(el).text().trim();
    if (text) {
      members.push(text);
    }
  });

  // Deduplicate
  const uniqueMembers = [...new Set(members)];

  const assignments = [];
  for (const raw of uniqueMembers) {
    const clean = normalizeName(raw);
    if (!clean) continue;

    let role = 'Member';
    if (/Chair/i.test(raw)) role = 'Chair';
    if (/Ranking/i.test(raw)) role = 'Ranking';
    if (/Vice Chair/i.test(raw)) role = 'Vice Chair';

    const sen = findSenatorByName(clean);
    if (sen) {
      assignments.push({
        bioguideId: sen.id.bioguide,
        committee: name,
        role
      });
    }
  }

  return assignments;
}

async function run() {
  const allAssignments = [];

  for (const committee of committeesConfig) {
    const assignments = await scrapeCommittee(committee);
    allAssignments.push(...assignments);
  }

  // Group by senator
  const output = senators.map(sen => {
    const bioguideId = sen.id.bioguide;
    const committees = allAssignments
      .filter(a => a.bioguideId === bioguideId)
      .map(a => ({ name: a.committee, role: a.role }));

    const leadership = committees.filter(c =>
      ['Chair', 'Ranking', 'Vice Chair'].includes(c.role)
    );

    return {
      bioguideId,
      committees,
      committeeLeadership: leadership
    };
  });

  fs.writeFileSync('public/senators-committees.json', JSON.stringify(output, null, 2));
  console.log('Committee scraper complete!');
}

run().catch(err => console.error(err));
