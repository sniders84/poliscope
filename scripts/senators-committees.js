const fs = require('fs');
const fetch = require('node-fetch');

const ASSIGNMENTS_URL = 'https://www.senate.gov/general/committee_assignments/assignments.htm';

function cleanName(text) {
  return text
    .replace(/\[|\]/g, '')
    .replace(/\s*\(.*?\)\s*/g, '')
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
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!res.ok) {
      console.error(`Failed to fetch: ${res.status} ${res.statusText}`);
      return;
    }

    const html = await res.text();

    // Strip HTML tags to get plain text
    const plainText = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

    // Split on senator names (look for patterns like "Alsobrooks, Angela D. (D-MD)")
    const senatorBlocks = plainText.split(/(?=[A-Z][a-z]+,\s[A-Z][a-z]+\s[A-Z]?[a-z]*\s*\([A-Z]-[A-Z]{2}\))/g);

    const senators = [];

    senatorBlocks.forEach(block => {
      block = block.trim();
      if (!block) return;

      // Extract name from start of block
      const nameMatch = block.match(/^([A-Z][a-z]+,\s[A-Z][a-z]+\s[A-Z]?[a-z]*)\s*\([A-Z]-[A-Z]{2}\)/);
      if (!nameMatch) return;

      const rawName = nameMatch[1];
      const name = cleanName(rawName);

      const committees = [];

      // Look for bullet points in the block
      const lines = block.split('•').map(l => l.trim()).filter(l => l);
      lines.forEach(line => {
        if (line.includes('Committee on') || line.includes('Select Committee') || line.includes('Special Committee')) {
          const roleMatch = line.match(/\((Chairman|Chair|Chairwoman|Ranking Member|Vice Chair)\)/i);
          const role = roleMatch ? detectRole(roleMatch[1]) : 'Member';
          const committeeName = line
            .replace(/\s*\(.*?\)\s*/g, '')
            .trim();

          committees.push({
            committee: committeeName,
            role
          });
        }
      });

      if (committees.length > 0) {
        senators.push({ name, committees });
        console.log(`Parsed ${name}: ${committees.length} committees`);
      }
    });

    console.log(`Total senators parsed: ${senators.length}`);

    fs.writeFileSync('public/senators-committees.json', JSON.stringify(senators, null, 2));
    console.log('senators-committees.json updated!');
  } catch (err) {
    console.error('Error:', err.message);
  }
}

scrapeAssignments();
