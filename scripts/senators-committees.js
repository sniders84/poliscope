const fs = require('fs');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

const ASSIGNMENTS_URL = 'https://www.senate.gov/general/committee_assignments/assignments.htm';

function cleanName(text) {
  return text
    .replace(/\[|\]/g, '')                    // Remove any brackets
    .replace(/\s*\(.*?\)\s*/g, '')            // Strip (D-MD) or similar
    .replace(/Senator\s*/gi, '')              // Remove "Senator" prefix
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
  console.log(`Scraping all committee assignments from ${ASSIGNMENTS_URL}`);

  try {
    const res = await fetch(ASSIGNMENTS_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ElectorateBot/1.0; +https://electorate.app)'
      }
    });

    if (!res.ok) {
      console.error(`Failed to fetch assignments page: ${res.status} ${res.statusText}`);
      return [];
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    const senators = {};

    // The page structure: senator names in <a> or <strong> tags, followed by committee text in paragraphs or divs
    // We'll iterate over strong/bold tags or links containing senator names
    $('strong, b, a[href*="senator"], p > strong').each((i, el) => {
      let nameText = $(el).text().trim();

      if (!nameText || nameText.length < 5) return;

      // Skip non-senator content (headers, instructions, etc.)
      if (/committee assignments|senate committee|alphabetical/i.test(nameText)) return;

      const name = cleanName(nameText);
      if (name.split(' ').length < 2) return; // Need at least first + last

      // Get the following text content (committees are usually in the same <p> or next siblings)
      let committeeBlock = '';
      let current = $(el).parent();

      // Collect text from current and next few elements until next senator-like block
      for (let j = 0; j < 5; j++) { // Limit to avoid infinite loop
        if (!current.length) break;
        committeeBlock += current.text() + '\n';
        current = current.next();
        if (current.find('strong, b, a[href*="senator"]').length > 0) break; // Next senator
      }

      // Split into lines and parse committees
      const lines = committeeBlock
        .split('\n')
        .map(l => l.trim())
        .filter(l => l && !/^\d/.test(l) && !/^committee assignments/i.test(l));

      const committees = [];
      let currentCommittee = null;

      lines.forEach(line => {
        if (line.includes('Committee on') || line.includes('Select Committee') || line.includes('Special Committee')) {
          // New committee
          const role = detectRole(line);
          currentCommittee = {
            committee: line.replace(/\s*\(.*?\)\s*/g, '').trim(),
            role
          };
          committees.push(currentCommittee);
        } else if (currentCommittee && (line.startsWith('*') || line.includes('Subcommittee'))) {
          // Optional: append subcommittee as note (for now we skip to keep simple)
        }
      });

      if (committees.length > 0) {
        senators[name] = {
          name,
          committees
        };
        console.log(`Parsed ${name}: ${committees.length} committees`);
      }
    });

    const result = Object.values(senators);
    console.log(`Successfully parsed committees for ${result.length} senators`);

    fs.writeFileSync('public/senators-committees.json', JSON.stringify(result, null, 2));
    console.log('senators-committees.json fully updated!');
  } catch (err) {
    console.error('Fatal error during scraping:', err.message);
    process.exit(1);
  }
}

scrapeAssignments();
