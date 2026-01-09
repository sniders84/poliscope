const fs = require('fs');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

// Hardcode known vote URLs from senate.gov (update as new votes happen)
const VOTE_URLS = [
  'https://www.senate.gov/legislative/LIS/roll_call_votes/vote1191/vote_119_1_00004.htm',
  'https://www.senate.gov/legislative/LIS/roll_call_votes/vote1191/vote_119_1_00003.htm',
  'https://www.senate.gov/legislative/LIS/roll_call_votes/vote1191/vote_119_1_00002.htm',
  'https://www.senate.gov/legislative/LIS/roll_call_votes/vote1191/vote_119_1_00001.htm'
  // Add more as new votes appear on https://www.senate.gov/legislative/LIS/roll_call_lists/vote_menu_119_1.htm
];

function cleanName(text) {
  return text.replace(/\s*\(.*?\)\s*/g, '').trim(); // Strip (R-AL)
}

async function scrapeVote(url, senatorNames) {
  const res = await fetch(url);
  if (!res.ok) return;
  const html = await res.text();
  const $ = cheerio.load(html);

  const notVoting = [];
  $('h3:contains("Not Voting")').nextAll('p, div').first().text().split(/[\n,]/).forEach(line => {
    const cleaned = cleanName(line.trim());
    if (cleaned && senatorNames.includes(cleaned)) {
      notVoting.push(cleaned);
    }
  });

  return notVoting;
}

async function main() {
  // Load base senators to get names
  const base = JSON.parse(fs.readFileSync('public/senators-rankings.json', 'utf8'));
  const senatorNames = base.map(s => s.name);

  const missed = {};
  senatorNames.forEach(name => missed[name] = 0);

  for (const url of VOTE_URLS) {
    const notVoting = await scrapeVote(url, senatorNames);
    notVoting.forEach(name => {
      if (missed[name] !== undefined) missed[name]++;
    });
  }

  const output = senatorNames.map(name => ({
    name,
    missedVotes: missed[name] || 0,
    totalVotes: VOTE_URLS.length
  }));

  fs.writeFileSync('public/senators-votes.json', JSON.stringify(output, null, 2));
  console.log('senators-votes.json updated! Total votes:', VOTE_URLS.length);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
