const fs = require('fs');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

// Sessions: 119th Congress, 1st and 2nd
const SESSIONS = [
  { prefix: 'vote1191', session: '1', max: 999 },
  { prefix: 'vote1192', session: '2', max: 999 }
];

function buildUrl(sessionPrefix, sessionNum, voteNum) {
  const padded = String(voteNum).padStart(5, '0');
  return `https://www.senate.gov/legislative/LIS/roll_call_votes/${sessionPrefix}/vote_119_${sessionNum}_${padded}.htm`;
}

function parseGroups($) {
  const groups = { Yea: [], Nay: [], 'Not Voting': [] };

  $('h3').each((i, el) => {
    const heading = $(el).text().trim();
    let group = null;
    if (/YEAs/i.test(heading)) group = 'Yea';
    else if (/NAYs/i.test(heading)) group = 'Nay';
    else if (/Not Voting/i.test(heading)) group = 'Not Voting';
    if (!group) return;

    // Names are usually in the next sibling <p> or <div>
    const namesBlock = $(el).next().text();
    const names = namesBlock
      .split(/\s{2,}|\n+/)
      .map(s => s.trim())
      .filter(s => /\([DRI]-[A-Z]{2}\)/.test(s));

    names.forEach(n => {
      const cleaned = n.replace(/\s+/g, ' ').replace(/\(.*?\)/, '').trim();
      groups[group].push(cleaned);
    });
  });

  return groups;
}

async function scrapeVotes() {
  const senators = {};

  for (const session of SESSIONS) {
    for (let i = 1; i <= session.max; i++) {
      const url = buildUrl(session.prefix, session.session, i);
      let res;
      try {
        res = await fetch(url);
      } catch {
        continue;
      }
      if (!res.ok) continue;

      const html = await res.text();
      const $ = cheerio.load(html);
      const groups = parseGroups($);

      const yea = groups['Yea'];
      const nay = groups['Nay'];
      const notVoting = groups['Not Voting'];

      if (yea.length === 0 && nay.length === 0 && notVoting.length === 0) continue;

      const all = new Set([...yea, ...nay, ...notVoting]);
      all.forEach(name => {
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
