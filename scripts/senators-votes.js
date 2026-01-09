const fs = require('fs');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

const INDEX_URLS = [
  'https://www.senate.gov/legislative/LIS/roll_call_lists/vote_menu_119_1.xml',
];

function cleanName(text) {
  return text
    .replace(/Sen\.?\s*/gi, '')
    .replace(/\s*\([RDIA]-[A-Z]{2}\)\s*/gi, '')
    .replace(/,\s*[A-Z][a-z]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function getRecentVoteUrls(maxVotes = 100) {
  const voteUrls = [];
  for (const indexUrl of INDEX_URLS) {
    try {
      const res = await fetch(indexUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ElectorateBot/1.0)' }
      });
      if (!res.ok) continue;
      const xml = await res.text();

      const matches = [...xml.matchAll(/<vote_number>(\d+)<\/vote_number>/g)];
      const session = indexUrl.includes('_1.xml') ? '1' : '2';

      matches.forEach(match => {
        const num = match[1].padStart(5, '0');
        const url = `https://www.senate.gov/legislative/LIS/roll_call_votes/vote119${session}/vote_119_${session}_${num}.htm`;
        voteUrls.push(url);
      });

      console.log(`Found ${matches.length} votes in session ${session}`);
    } catch (err) {
      console.log(`Error fetching index ${indexUrl}: ${err.message}`);
    }
  }

  // Sort descending (newest first) and limit to recent
  voteUrls.sort((a, b) => b.localeCompare(a));
  const recent = voteUrls.slice(0, maxVotes);
  console.log(`Processing ${recent.length} most recent vote URLs`);
  return recent;
}

async function scrapeNotVoting(url, senatorNamesSet) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ElectorateBot/1.0; +https://electorate.app)' }
    });
    if (!res.ok) {
      console.log(`Skipped ${url} - ${res.status}`);
      return [];
    }
    const html = await res.text();
    const $ = cheerio.load(html);

    const notVoting = [];
    $('h3:contains("Not Voting"), strong:contains("Not Voting")').each((i, el) => {
      const block = $(el).nextAll().addBack().text();
      block.split(/[\n,;]/).forEach(line => {
        const cleaned = cleanName(line.trim());
        if (cleaned && senatorNamesSet.has(cleaned)) {
          notVoting.push(cleaned);
        }
      });
    });
    return notVoting;
  } catch (err) {
    console.log(`Error on ${url}: ${err.message}`);
    return [];
  }
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const base = JSON.parse(fs.readFileSync('public/senators-rankings.json', 'utf8'));
  const senatorNames = base.map(s => cleanName(s.name));
  const senatorNamesSet = new Set(senatorNames);

  const voteUrls = await getRecentVoteUrls(100); // Limit to 100 to avoid bans

  const missed = {};
  senatorNames.forEach(name => missed[name] = 0);

  for (const url of voteUrls) {
    console.log(`Processing ${url}`);
    const notVoting = await scrapeNotVoting(url, senatorNamesSet);
    notVoting.forEach(name => {
      if (missed[name] !== undefined) missed[name]++;
    });
    await delay(2000); // 2-second delay to be polite
  }

  const output = senatorNames.map(name => ({
    name,
    missedVotes: missed[name] || 0,
    totalVotes: voteUrls.length // This is now "processed" count, not total discovered
  }));

  fs.writeFileSync('public/senators-votes.json', JSON.stringify(output, null, 2));
  console.log(`Updated! Processed ${voteUrls.length} votes`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
