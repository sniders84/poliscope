const fs = require('fs');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

const ASSIGNMENTS_URL = 'https://www.senate.gov/general/committee_assignments/assignments.htm';

function cleanName(text) {
  return text
    .replace(/\[|\]/g, '')
    .replace(/\s*\(.*?\)\s*/g, '')  // strip (D-MD)
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
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
    });

    if (!res.ok) {
      console.error(`Failed: ${res.status}`);
      return [];
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    const senators = {};

    // The content is in <p> tags with plain text
    $('p').each((i, p) => {
      const pText = $(p).text().trim();
      if (!pText) return;

      // Match senator line: [Name](url) (Party-State)
      const nameMatch = pText.match(/^\[([^\]]+)\]\([^)]+\)\s*\(([A-Z]-[A-Z]{2})\)/);
      if (!nameMatch) return;

      const rawName = nameMatch[1];
      const name = cleanName(rawName);
      if (name.split(' ').length < 2) return;

      // Get the rest of the text for committees
      const committeeText = pText.substring(nameMatch[0].length).trim();

      // Split lines starting with *
      const lines = committeeText.split('\n').map(l => l.trim()).filter(l => l.startsWith('*'));

      const committees = [];
      lines.forEach(line => {
        const cleanLine = line.replace(/^\*\s*/, '').trim();
        const roleMatch = cleanLine.match(/\s*\((Chairman|Chair|Chairwoman|Ranking Member|Ranking|Vice Chair)\)/i);
        const role = roleMatch ? detectRole(roleMatch[1]) : 'Member';
        const committee = cleanLine.replace(/\s*\(.*?\)\s*/g, '').replace(/\*\*/g, '').trim();
        if (committee) {
          committees.push({ committee, role });
        }
      });

      if (committees.length > 0) {
        senators[name] = { name, committees };
        console.log(`Parsed ${name}: ${committees.length} committees`);
      }
    });

    const result = Object.values(senators);
    console.log(`Total parsed: ${result.length} senators`);

    fs.writeFileSync('public/senators-committees.json', JSON.stringify(result, null, 2));
    console.log('senators-committees.json updated!');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

scrapeAssignments();
