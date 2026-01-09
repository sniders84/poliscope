const fs = require('fs');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

// Central assignments page for 119th Congress
const ASSIGNMENTS_URL = 'https://www.senate.gov/general/committee_assignments/assignments.htm';

function cleanName(text) {
  return text
    .replace(/\[|\]/g, '')              // Remove brackets
    .replace(/\s*\(.*?\)\s*/g, '')      // Strip (D-MD)
    .replace(/Senator\s*/gi, '')
    .trim();
}

function detectRole(text) {
  text = text.toLowerCase();
  if (text.includes('chairman') || text.includes('chair')) return 'Chairman';
  if (text.includes('ranking member') || text.includes('ranking')) return 'Ranking Member';
  if (text.includes('vice chair')) return 'Vice Chair';
  return 'Member';
}

async function scrapeAllAssignments() {
  console.log(`Scraping all assignments from ${ASSIGNMENTS_URL}`);
  const res = await fetch(ASSIGNMENTS_URL);
  if (!res.ok) {
    console.log(`Failed assignments page: ${res.status}`);
    return {};
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  const senators = {};

  // The page uses <a> for senator names, then text blocks for committees
  // We look for patterns like [Name] (Party-State) then **Committee** (Role)
  $('a[href*=".senate.gov"]').each((i, el) => {
    const linkText = $(el).text().trim();
    if (!linkText.includes('[')) return; // Skip non-senator links

    const name = cleanName(linkText);
    if (name.split(' ').length < 2) return; // Skip invalid

    // Get the full block after the name (next siblings until next senator)
    let block = $(el).parent().nextAll().addBack().contents().filter(function() {
      return this.type === 'text' || $(this).is('strong, b');
    }).text().trim();

    if (!block) block = $(el).closest('p, div').text().trim();

    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);

    const committees = [];
    let currentCommittee = null;

    lines.forEach(line => {
      if (line.startsWith('**') || line.startsWith('Committee on')) {
        // New committee
        const committeeText = line.replace(/\*\*/g, '').trim();
        const role = detectRole(committeeText);
        currentCommittee = {
          committee: committeeText.replace(/\s*\(.*?\)\s*/g, '').trim(),
          role
        };
        committees.push(currentCommittee);
      } else if (currentCommittee && (line.startsWith('*') || line.startsWith('Subcommittee'))) {
        // Subcommittee — optional: add to current committee
        // For now, we can skip or append as sub-role
      }
    });

    if (committees.length > 0) {
      senators[name] = {
        name,
        committees
      };
    }
  });

  const result = Object.values(senators);
  console.log(`Found committees for ${result.length} senators`);

  fs.writeFileSync('public/senators-committees.json', JSON.stringify(result, null, 2));
  console.log('senators-committees.json updated!');
}

scrapeAllAssignments().catch(err => {
  console.error(err);
  process.exit(1);
});
