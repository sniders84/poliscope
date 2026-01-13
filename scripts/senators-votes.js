const fs = require('fs');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

const INDEX_URLS = [
  'https://www.senate.gov/legislative/LIS/roll_call_lists/vote_menu_119_1.xml',
  // Add '_2.xml' later when 2nd session starts
];

function cleanName(text) {
  return text
    .replace(/Sen\.?\s*/gi, '')
    .replace(/\s*\([RDIA]-[A-Z]{2}\)\s*/gi, '')
    .replace(/,\s*[A-Z][a-z]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function getRecentVoteUrls(maxVotes = 50) {
  const voteUrls = [];
  for (const indexUrl of INDEX_URLS) {
    try {
      const res = await fetch(indexUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Referer': 'https://www.senate.gov/legislative/LIS/roll_call_lists/vote_menu_119_1.htm'
        }
      });

      if (!res.ok) {
        console.log(`Index fetch failed: ${indexUrl} - ${res.status}`);
        continue;
      }

      const xml = await res.text();
      const matches = [...xml.matchAll(/<vote_number>(\d+)<\/vote_number>/g)];
      const session = indexUrl.includes('_1.xml') ? '1' : '2';

      matches.forEach(match => {
        const num = match[1].padStart(5, '0');
        const url = `https://www.senate.gov/legislative/LIS/roll_call_votes/vote119${session}/vote_119_${session}_${num}.htm`;
        voteUrls.push(url);
      });

      console.log(`Found ${matches.length} votes in session ${session} from index`);
    } catch (err) {
      console.log(`Error fetching index ${indexUrl}: ${err.message}`);
    }
  }

  // Sort descending (newest first) and limit
  voteUrls.sort((a, b) => b.localeCompare(a));
  const recent = voteUrls.slice(0, maxVotes);
  console.log(`Selected ${recent.length} most recent vote URLs to process`);
  return recent;
}

async function scrapeNotVoting(url, senatorNamesSet) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Referer': 'https://www.senate.gov/legislative/LIS/roll_call_lists/vote_menu_119_1.htm'
      }
    });

    if (!res.ok) {
      console.log(`Skipped ${url} - ${res.status} ${res.statusText}`);
      return [];
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    const notVoting = [];
    // Broader selector for Not Voting section
    $('h3:contains("Not Voting"), h3:contains("not voting"), strong:contains("Not Voting"), p:contains("Not Voting")').each((i, el) => {
      const block = $(el).nextUntil('h3, strong, p').addBack().text() + $(el).text();
      block.split(/[\n,;]/).forEach(line => {
        const cleaned = cleanName(line.trim());
        if (cleaned && senatorNamesSet.has(cleaned)) {
          notVoting.push(cleaned);
        }
      });
    });

    if (notVoting.length > 0) {
      console.log(`Found ${notVoting.length} not voting on ${url.split('/').pop()}`);
    }

    return notVoting;
  } catch (err) {
    console.log(`Error scraping ${url}: ${err.message}`);
    return [];
  }
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  // Load senator names from base file
  const base = JSON.parse(fs.readFileSync('public/senators-rankings.json', 'utf8'));
  const senatorNames = base.map(s => cleanName(s.name));
  const senatorNamesSet = new Set(senatorNames);

  const voteUrls = await getRecentVoteUrls(50); // Start with 50; increase if needed

  const missed = {};
  senatorNames.forEach(name => missed[name] = 0);

  let processedCount = 0;
  for (const url of voteUrls) {
    console.log(`Processing ${url}`);
    const notVoting = await scrapeNotVoting(url, senatorNamesSet);
    notVoting.forEach(name => {
      if (missed[name] !== undefined) {
        missed[name]++;
      }
    });
    processedCount++;
    await delay(3000); // 3-second delay to be very polite
  }

  const output = senatorNames.map(name => ({
    name,
    missedVotes: missed[name] || 0,
    totalVotes: processedCount // Number of successfully attempted/processed votes
  }));

  fs.writeFileSync('public/senators-votes.json', JSON.stringify(output, null, 2));
  console.log(`senators-votes.json updated! Processed ${processedCount} votes`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
