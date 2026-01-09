const fs = require('fs');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

// Senate.gov vote index pages for 119th Congress (update year/session if needed)
const INDEX_URLS = [
  'https://www.senate.gov/legislative/LIS/roll_call_lists/vote_menu_119_1.xml', // 1st session
  // Add 'vote_menu_119_2.xml' when 2nd session starts (likely Jan 2027)
];

// Helper to clean senator names consistently
function cleanName(text) {
  return text
    .replace(/Sen\.?\s*/gi, '')           // Remove "Sen."
    .replace(/\s*\(.*?\)\s*/g, '')       // Strip (R-AL)
    .replace(/,\s*[A-Z][a-z]+/g, '')     // Remove ", Katie"
    .replace(/\s+/g, ' ')
    .trim();
}

async function getVoteUrls() {
  const voteUrls = [];
  for (const indexUrl of INDEX_URLS) {
    try {
      const res = await fetch(indexUrl);
      if (!res.ok) {
        console.log(`Index fetch failed: ${indexUrl} - ${res.status}`);
        continue;
      }
      const xml = await res.text();

      // Senate XML has <vote_number> tags
      const matches = xml.matchAll(/<vote_number>(\d+)<\/vote_number>/g);
      for (const match of matches) {
        const num = match[1].padStart(5, '0');
        // Build URL: vote_119_1_00001.htm etc.
        const session = indexUrl.includes('_1.xml') ? '1' : '2';
        const url = `https://www.senate.gov/legislative/LIS/roll_call_votes/vote119${session}/vote_119_${session}_${num}.htm`;
        voteUrls.push(url);
      }
    } catch (err) {
      console.log(`Error fetching index ${indexUrl}: ${err.message}`);
    }
  }
  console.log(`Found ${voteUrls.length} vote URLs`);
  return voteUrls;
}

async function scrapeNotVoting(url, senatorNamesSet) {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.log(`Vote page failed: ${url} - ${res.status}`);
      return [];
    }
    const html = await res.text();
    const $ = cheerio.load(html);

    const notVoting = [];
    // Senate pages have <h3>Not Voting</h3> followed by names in <p> or text blocks
    $('h3:contains("Not Voting"), h3:contains("not voting")').each((i, el) => {
      const block = $(el).nextUntil('h3').addBack().text();
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
  // Load base senators for names (use Set for fast lookup)
  const base = JSON.parse(fs.readFileSync('public/senators-rankings.json', 'utf8'));
  const senatorNames = base.map(s => cleanName(s.name)); // Clean once
  const senatorNamesSet = new Set(senatorNames);

  const voteUrls = await getVoteUrls();
  if (voteUrls.length === 0) {
    console.log('No votes found - using fallback');
    return;
  }

  const missed = {};
  senatorNames.forEach(name => missed[name] = 0);

  for (const url of voteUrls) {
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
  console.log(`senators-votes.json updated! Total votes: ${voteUrls.length}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
