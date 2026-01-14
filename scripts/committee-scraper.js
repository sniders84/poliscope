const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

const RANKINGS_PATH = path.join(__dirname, '../public/senators-rankings.json');
const INDEX_URL = 'https://www.senate.gov/committees/index.htm';

async function getCommitteeMemberUrls() {
  const res = await fetch(INDEX_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  });
  if (!res.ok) throw new Error(`Index fetch failed: ${res.status}`);

  const html = await res.text();
  const $ = cheerio.load(html);

  const urls = [];
  $('a').each((i, el) => {
    const text = $(el).text().trim();
    const href = $(el).attr('href');
    if (text === 'Committee Member List' && href && href.includes('committee_memberships_')) {
      urls.push('https://www.senate.gov' + href);
    }
  });

  console.log(`Found ${urls.length} committee member list URLs`);
  return urls;
}

async function parseCommitteeMembers(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  });
  if (!res.ok) {
    console.warn(`Skipped ${url}: ${res.status}`);
    return [];
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  const members = [];
  let currentCommittee = $('h1, h2').first().text().trim() || 'Unknown Committee';

  // Parse majority/minority lists
  $('ul, ol, p strong').each((i, el) => {
    const text = $(el).text().trim();
    if (text.includes('Chairman') || text.includes('Ranking Member')) {
      // Leadership
      const role = text.includes('Chairman') ? 'Chairman' : 'Ranking Member';
      const name = text.replace(/Chairman|Ranking Member/g, '').trim();
      members.push({ name, role });
    } else if (text.includes('(') && text.includes(')')) {
      // Regular members
      const name = text.replace(/\s*\([RD]-[A-Z]{2}\).*$/, '').trim();
      if (name) members.push({ name, role: 'Member' });
    }
  });

  // Subcommittees (look for h3 or strong with "Subcommittee")
  $('h3, strong:contains("Subcommittee")').each((i, sub) => {
    const subName = $(sub).text().trim().replace('Subcommittee on', '').trim();
    if (subName) {
      // Add sub members similarly
      const subMembers = [];
      $(sub).nextAll('ul, p').first().find('li, a').each((j, li) => {
        const liText = $(li).text().trim();
        const name = liText.replace(/\s*\([RD]-[A-Z]{2}\).*$/, '').trim();
        if (name) subMembers.push({ name, role: liText.includes('Chairman') ? 'Chairman' : (liText.includes('Ranking') ? 'Ranking Member' : 'Member') });
      });
      members.push(...subMembers); // Flatten for aggregation
    }
  });

  return members;
}

async function aggregateBySenator() {
  const rankings = JSON.parse(fs.readFileSync(RANKINGS_PATH, 'utf8'));
  const nameToSen = new Map(rankings.map(s => [s.name, s]));

  const urls = await getCommitteeMemberUrls();

  for (const url of urls) {
    console.log(`Parsing ${url}`);
    const members = await parseCommitteeMembers(url);
    members.forEach(m => {
      const sen = nameToSen.get(m.name);
      if (sen) {
        if (!sen.committees) sen.committees = [];
        sen.committees.push({
          committee: 'Unknown Committee', // Replace with actual if parsed
          role: m.role,
          // subcommittees: [] // Add if parsed
        });
      }
    });
    await new Promise(r => setTimeout(r, 2000)); // Delay to avoid rate limit
  }

  fs.writeFileSync(RANKINGS_PATH, JSON.stringify(rankings, null, 2));
  console.log('senators-rankings.json updated with committees!');
}

aggregateBySenator().catch(err => {
  console.error(err);
  process.exit(1);
});
