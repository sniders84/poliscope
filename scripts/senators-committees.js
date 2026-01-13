const fs = require('fs');
const fetch = require('node-fetch');

const ASSIGNMENTS_URL = 'https://www.senate.gov/general/committee_assignments/assignments.htm';

function cleanName(text) {
  return text
    .replace(/\[|\]/g, '')
    .replace(/\s*\(.*?\)\s*/g, '')
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

  const res = await fetch(ASSIGNMENTS_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
  });

  if (!res.ok) {
    console.error(`Fetch failed: ${res.status} ${res.statusText}`);
    return;
  }

  const html = await res.text();
  // Get plain text, normalize
  let text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

  // Split on senator names (e.g., "Alsobrooks, Angela D. (D-MD)")
  const blocks = text.split(/(?=[A-Z][a-z]+,\s[A-Z][a-z]+\s?[A-Z]?[a-z]*\s*\([A-Z]-[A-Z]{2}\))/g);

  const senators = [];

  blocks.forEach(block => {
    block = block.trim();
    if (!block) return;

    // Extract name + party
    const nameMatch = block.match(/([A-Z][a-z]+,\s[A-Z][a-z]+\s?[A-Z]?[a-z]*)\s*\([A-Z]-[A-Z]{2}\)/);
    if (!nameMatch) return;

    const name = cleanName(nameMatch[1]);

    // Get content after name
    const content = block.substring(nameMatch[0].length).trim();

    // Split on main committee bullets (•)
    const committeeParts = content.split('•').map(p => p.trim()).filter(p => p);

    const committees = [];
    let current = null;

    committeeParts.forEach(part => {
      if (part.includes('Committee on') || part.includes('Select Committee') || part.includes('Special Committee')) {
        const role = detectRole(part);
        const committeeName = part.replace(/\s*\(.*?\)\s*/g, '').trim();
        current = { committee: committeeName, role, subcommittees: [] };
        committees.push(current);
      } else if (current && part.startsWith('o ')) {
        const subPart = part.replace('o ', '').trim();
        const subRole = detectRole(subPart);
        const subName = subPart.replace(/\s*\(.*?\)\s*/g, '').trim();
        current.subcommittees.push({ subcommittee: subName, role: subRole });
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
}

scrapeAssignments();
