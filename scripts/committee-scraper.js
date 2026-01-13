// committee-scraper.js
// Scrapes Senate committee membership pages from committees-config.json
// Outputs public/senators-committees.json

const fs = require('fs');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

const legislators = JSON.parse(fs.readFileSync('public/legislators-current.json', 'utf8'));
const senators = legislators.filter(l => l.terms.some(t => t.type === 'sen'));
const committeesConfig = JSON.parse(fs.readFileSync('scripts/committees-config.json', 'utf8'));

function normalizeName(raw) {
  return raw
    .replace(/\s+/g, ' ')
    .replace(/\(.*?\)/g, '') // strip (Party-State)
    .replace(/,/g, '')       // strip commas
    .trim();
}

function findSenatorByName(name) {
  return senators.find(s => s.name.official_full.toLowerCase() === name.toLowerCase());
}

// Hard-coded fallback memberships for committees that block scraping or have brittle markup
const hardcodedMemberships = {
  'Joint Committee on Taxation': [
    'Ron Wyden', 'Mike Crapo', 'Maria Cantwell', 'Chuck Grassley',
    'John Barrasso', 'Debbie Stabenow', 'John Cornyn', 'Ben Cardin',
    'Michael Bennet', 'Bill Cassidy', 'Bob Casey'
  ],
  'Select Committee on Ethics': [
    'James Lankford', 'Christopher Coons', 'Brian Schatz',
    'Deb Fischer', 'Chris Murphy', 'Dan Sullivan'
  ],
  'Joint Committee on Printing': [
    'Mitch McConnell', 'Amy Klobuchar', 'Deb Fischer',
    'Shelley Moore Capito', 'Charles E. Schumer'
  ],
  'Joint Committee on the Library': [
    'Mitch McConnell', 'Amy Klobuchar', 'Deb Fischer',
    'Shelley Moore Capito', 'Charles E. Schumer'
  ]
};

async function scrapeCommittee({ name, url }) {
  console.log(`Scraping committee: ${name}`);

  // Use hard-coded membership if defined
  if (hardcodedMemberships[name]) {
    console.log(`Using hard-coded membership for ${name}`);
    return hardcodedMemberships[name].map(fullName => {
      const sen = findSenatorByName(fullName);
      if (sen) {
        return { bioguideId: sen.id.bioguide, committee: name, role: 'Member' };
      }
      return null;
    }).filter(Boolean);
  }

  // Normal scrape for other committees
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`Failed to fetch ${url}: ${res.status}`);
    return [];
  }
  const html = await res.text();
  const $ = cheerio.load(html);

  const members = [];
  $('li, tr').each((_, el) => {
    const text = $(el).text().trim();
    if (text) members.push(text);
  });

  const assignments = [];
  for (const raw of members) {
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

  const output = senators.map(sen => {
    const bioguideId = sen.id.bioguide;
    const committees = allAssignments
      .filter(a => a.bioguideId === bioguideId)
      .map(a => ({ name: a.committee, role: a.role }));

    const leadership = committees.filter(c =>
      ['Chair', 'Ranking', 'Vice Chair'].includes(c.role)
    );

    return { bioguideId, committees, committeeLeadership: leadership };
  });

  fs.writeFileSync('public/senators-committees.json', JSON.stringify(output, null, 2));
  console.log('Committee scraper complete!');
}

run().catch(err => console.error(err));
