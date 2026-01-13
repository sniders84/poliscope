const fs = require('fs');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

const ASSIGNMENTS_URL = 'https://www.senate.gov/general/committee_assignments/assignments.htm';

function cleanName(text) {
  return text
    .replace(/$$   |   $$/g, '')
    .replace(/\s*$$   .*?   $$\s*/g, '')  // strip (D-MD)
    .replace(/\s*$$   .*?   $$/g, '')     // extra cleanup
    .replace(/Senator\s*/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectRole(text) {
  const lower = text.toLowerCase();
  if (/chairman|chair|chairwoman/.test(lower)) return 'Chairman';
  if (/ranking member|ranking/.test(lower)) return 'Ranking Member';
  if (/vice chair/.test(lower)) return 'Vice Chair';
  return 'Member';
}

async function scrapeAssignments() {
  console.log(`Scraping ${ASSIGNMENTS_URL}`);

  try {
    const res = await fetch(ASSIGNMENTS_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ElectorateBot/1.0; +https://electorate.app)' }
    });

    if (!res.ok) {
      console.error(`Failed: ${res.status}`);
      return [];
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    const senators = {};

    // Iterate over all <p> (main content blocks)
    $('p').each((i, p) => {
      const pText = $(p).text().trim();
      if (!pText) return;

      // Match senator start: [Name](link) (Party-State)
      const senatorMatch = pText.match(/^$$   ([^   $$]+)\]$$   [^)]+   $$\s*$$   ([A-Z]-[A-Z]{2})   $$/);
      if (!senatorMatch) return;

      const rawName = senatorMatch[1];
      const name = cleanName(rawName);
      if (name.split(' ').length < 2) return;

      // Get committee lines: after name, lines starting with * **Committee**
      const committeeLines = pText
        .substring(senatorMatch[0].length)
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.startsWith('*'));

      const committees = [];
      committeeLines.forEach(line => {
        const cleanLine = line.replace(/^\*\s*\*\*(.*?)\*\*/, '$1').trim();
        if (!cleanLine) return;

        const role = detectRole(cleanLine);
        const committee = cleanLine
          .replace(/Chairman|Ranking Member|Vice Chair/gi, '')
          .trim();

        if (committee && committee.includes('Committee')) {
          committees.push({ committee, role });
        }
      });

      if (committees.length > 0) {
        senators[name] = { name, committees };
        console.log(`Parsed ${name}: ${committees.length} committees`);
      }
    });

    const result = Object.values(senators);
    console.log(`Total senators: ${result.length}`);

    fs.writeFileSync('public/senators-committees.json', JSON.stringify(result, null, 2));
    console.log('Updated!');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

scrapeAssignments();
