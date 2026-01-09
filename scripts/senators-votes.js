// scripts/senators-votes.js
const fs = require('fs');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

// Build all vote detail page URLs for 119th Congress sessions 1 and 2
// Index pages list vote numbers, but since you want HTML pages grouped by YEAs/NAYs/Not Voting,
// we’ll iterate a reasonable range and skip 404s gracefully.
// If you prefer, you can first parse the XML index to get exact counts, then hit the HTML pages.
const SESSIONS = [
  { prefix: 'vote1191', start: 1, end: 999 }, // session 1
  { prefix: 'vote1192', start: 1, end: 999 }  // session 2
];

function buildUrl(sessionPrefix, num) {
  const padded = String(num).padStart(5, '0'); // e.g., 00001
  return `https://www.senate.gov/legislative/LIS/roll_call_votes/${sessionPrefix}/vote_119_${sessionPrefix.endsWith('1') ? '1' : '2'}_${padded}.htm`;
}

// Parse grouped sections: YEAs, NAYs, Not Voting
function parseGroupedVotes($) {
  const groups = { Yea: [], Nay: [], 'Not Voting': [] };

  // Find headings that contain group labels
  $('h3, h2, strong, b').each((i, el) => {
    const heading = $(el).text().trim();
    let currentGroup = null;

    if (/YEAs/i.test(heading)) currentGroup = 'Yea';
    else if (/NAYs/i.test(heading)) currentGroup = 'Nay';
    else if (/Not Voting/i.test(heading)) currentGroup = 'Not Voting';
    else return;

    // The list of names typically follows the heading in the next sibling or within the same section
    const section = $(el).parent();
    const textBlock = section.text();

    // Extract names like "Last (Party-State)" or "Last, First (Party-State)"
    const names = textBlock
      .split(/\s{2,}|\n+/)
      .map(s => s.trim())
      .filter(s => s && /[A-Za-z]/.test(s))
      .filter(s => /\([DRI]-[A-Z]{2}\)/.test(s)); // ensure it looks like a senator entry

    names.forEach(n => {
      // Normalize to "Last, First" if present; otherwise keep "Last (Party-State)" form
      const cleaned = n.replace(/\s+/g, ' ').replace(/\(.*?\)/, '').trim();
      groups[currentGroup].push(cleaned);
    });
  });

  return groups;
}

async function scrapeVotes() {
  const senators = {}; // name -> { missedVotes, totalVotes }

  for (const session of SESSIONS) {
    for (let i = session.start; i <= session.end; i++) {
      const url = buildUrl(session.prefix, i);
      let res;
      try {
        res = await fetch(url);
      } catch {
        continue;
      }
      if (!res.ok) {
        // Stop early if we hit a long run of 404s (optional optimization)
        continue;
      }
      const html = await res.text();
      const $ = cheerio.load(html);

      const groups = parseGroupedVotes($);
      const yea = groups['Yea'];
      const nay = groups['Nay'];
      const notVoting = groups['Not Voting'];

      // If page didn’t parse into groups, skip
      if (yea.length === 0 && nay.length === 0 && notVoting.length === 0) continue;

      // Tally totals
      const allParticipants = new Set([...yea, ...nay, ...notVoting]);
      allParticipants.forEach(name => {
        if (!senators[name]) senators[name] = { name, missedVotes: 0, totalVotes: 0 };
        senators[name].totalVotes++;
      });
      notVoting.forEach(name => {
        if (!senators[name]) senators[name] = { name, missedVotes: 0, totalVotes: 0 };
        senators[name].missedVotes++;
      });
    }
  }

  fs.writeFileSync('public/senators-votes.json', JSON.stringify(Object.values(senators), null, 2));
  console.log('senators-votes.json fully updated!');
}

scrapeVotes().catch(err => {
  console.error(err);
  process.exit(1);
});
