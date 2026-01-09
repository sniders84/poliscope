const fs = require('fs');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

// Official Senate index XML for 119th Congress sessions
const INDEX_URLS = [
  'https://www.senate.gov/legislative/LIS/roll_call_lists/vote_menu_119_1.xml', // 1st session (2025-2026)
  // 'https://www.senate.gov/legislative/LIS/roll_call_lists/vote_menu_119_2.xml' // Add when 2nd session starts (~Jan 2027)
];

// Clean senator names for matching (handles variations like "Sen. Katie Britt", "Britt, Katie (R-AL)")
function cleanName(text) {
  return text
    .replace(/Sen\.?\s*/gi, '')
    .replace(/\s*\([RD]-[A-Z]{2}\)\s*/gi, '')
    .replace(/,\s*[A-Z][a-z]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function getAllVoteUrls() {
  const voteUrls = [];
  for (const indexUrl of INDEX_URLS) {
    try {
      const res = await fetch(indexUrl);
      if (!res.ok) {
        console.log(`Failed to fetch index ${indexUrl} - ${res.status}`);
        continue;
      }
      const xml = await res.text();

      // Parse <vote_number> tags
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

  if (voteUrls.length === 0) {
    console.log('No votes found - check index URLs');
  } else {
    console.log(`Total vote URLs discovered: ${voteUrls.length}`);
  }
  return voteUrls;
}

async function scrapeNotVoting(url, senatorNamesSet) {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.log(`Skipped vote ${url} - ${res.status}`);
      return [];
    }
    const html = await res.text();
    const $ = cheerio.load(html);

    const notVoting = [];
    // Find "Not Voting" section (h3 or strong text)
    $('h3:contains("Not Voting"), strong:contains("Not Voting"), h3:contains("not voting")').each((i, el) => {
      // Get all following text until next heading
      const block = $(el).nextUntil('h3, strong').addBack().text() + $(el).text();
      block.split(/[\n,;]/).forEach(line => {
        const cleaned = cleanName(line.trim());
        if (cleaned && senatorNamesSet.has(cleaned)) {
          notVoting.push(cleaned);
        }
      });
    });

    return notVoting;
  } catch (err) {
    console.log(`Scrape error on ${url}: ${err.message}`);
    return [];
  }
}

async function main() {
  // Load base senators for names (use cleaned Set for fast lookup)
  const base = JSON.parse(fs.readFileSync('public/senators-rankings.json', 'utf8'));
  const senatorNames = base.map(s => cleanName(s.name));
  const senatorNamesSet = new Set(senatorNames);

  const voteUrls = await getAllVoteUrls();
  if (voteUrls.length === 0) {
    console.log('No votes available yet - output will have totalVotes 0');
  }

  const missed = {};
  senatorNames.forEach(name => missed[name] = 0);

  for (const url of voteUrls) {
    console.log(`Processing vote: ${url}`);
    const notVoting = await scrapeNotVoting(url, senatorNamesSet);
    notVoting.forEach(name => {
      if (missed[name] !== undefined) {
        missed[name]++;
      }
    });
  }

  const output = senatorNames.map(name => ({
    name,
    missedVotes: missed[name] || 0,
    totalVotes: voteUrls.length
  }));

  fs.writeFileSync('public/senators-votes.json', JSON.stringify(output, null, 2));
  console.log(`senators-votes.json updated! Total roll call votes: ${voteUrls.length}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
