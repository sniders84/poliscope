const fs = require('fs');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

const base = JSON.parse(fs.readFileSync('public/senators-rankings.json', 'utf8'));
const senatorNames = base.map(s => s.name.replace(/\s*\(.*?\)/, '').trim());
const senatorSet = new Set(senatorNames);

const INDEX_URL = 'https://www.senate.gov/legislative/LIS/roll_call_lists/vote_menu_119_1.xml';

async function getRecentVoteUrls(max = 20) {
  const res = await fetch(INDEX_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/xml,text/html',
      'Referer': 'https://www.senate.gov/legislative/LIS/roll_call_lists/vote_menu_119_1.htm'
    }
  });
  if (!res.ok) {
    console.log(`Index failed: ${res.status}`);
    return [];
  }
  const xml = await res.text();
  const matches = xml.match(/<vote_number>(\d+)<\/vote_number>/g) || [];
  const urls = matches.map(m => {
    const num = m.match(/\d+/)[0].padStart(5, '0');
    return `https://www.senate.gov/legislative/LIS/roll_call_votes/vote1191/vote_119_1_${num}.htm`;
  });
  urls.sort((a, b) => b.localeCompare(a)); // newest first
  return urls.slice(0, max);
}

async function scrapeNotVoting(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html',
      'Referer': 'https://www.senate.gov/legislative/LIS/roll_call_lists/vote_menu_119_1.htm'
    }
  });
  if (!res.ok) {
    console.log(`Skipped ${url.split('/').pop()}: ${res.status}`);
    return [];
  }
  const html = await res.text();
  const $ = cheerio.load(html);
  const notVoting = [];
  $('*:contains("Not Voting")').each((i, el) => {
    const text = $(el).nextAll().addBack().text();
    text.split(/[\n,;]/).forEach(line => {
      const cleaned = line.trim().replace(/\s*\([RD]-[A-Z]{2}\)/, '').replace(/Sen\.?\s*/gi, '');
      if (senatorSet.has(cleaned)) notVoting.push(cleaned);
    });
  });
  if (notVoting.length > 0) console.log(`Not Voting on ${url.split('/').pop()}: ${notVoting.length}`);
  return notVoting;
}

async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const missed = {};
  senatorNames.forEach(n => missed[n] = 0);

  const urls = await getRecentVoteUrls(20);
  console.log(`Processing ${urls.length} recent votes`);

  for (const url of urls) {
    const notV = await scrapeNotVoting(url);
    notV.forEach(n => missed[n]++);
    await delay(5000); // 5s delay to avoid rate limit
  }

  const output = senatorNames.map(name => ({
    name,
    missedVotes: missed[name] || 0,
    totalVotes: urls.length
  }));

  fs.writeFileSync('public/senators-votes.json', JSON.stringify(output, null, 2));
  console.log('senators-votes.json updated!');
}

main().catch(console.error);
