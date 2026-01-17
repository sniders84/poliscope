// scripts/votes-scraper.js
// Scrape Senate roll call votes from LIS vote menu pages (both sessions of 119th)
// Hardened fetch with full headers + retry logic

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const cheerio = require('cheerio');
const xml2js = require('xml2js');

const RANKINGS_PATH = path.join(__dirname, '../public/senators-rankings.json');
const MENU_URLS = [
  'https://www.senate.gov/legislative/LIS/roll_call_lists/vote_menu_119_1.htm',
  'https://www.senate.gov/legislative/LIS/roll_call_lists/vote_menu_119_2.htm'
];

const parser = new xml2js.Parser({ explicitArray: false });

// Hardened fetch with retries
async function fetchWithRetry(url, options = {}, retries = 3, delay = 5000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, options);
      if (res.ok) return res;
      console.error(`Attempt ${attempt} failed: ${res.status} ${res.statusText}`);
    } catch (err) {
      console.error(`Attempt ${attempt} error: ${err.message}`);
    }
    if (attempt < retries) {
      console.log(`Retrying in ${delay / 1000}s...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error(`Failed to fetch ${url} after ${retries} attempts`);
}

let rankings = [];
try {
  rankings = JSON.parse(fs.readFileSync(RANKINGS_PATH, 'utf8'));
} catch (err) {
  console.error('Failed to load senators-rankings.json:', err.message);
  process.exit(1);
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrapeSenateVotes() {
  let allXmlUrls = [];

  // Collect XML links from both session menu pages
  for (const menuUrl of MENU_URLS) {
    console.log(`Fetching Senate vote menu: ${menuUrl}`);
    try {
      const res = await fetchWithRetry(menuUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://www.senate.gov/',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      });

      const html = await res.text();
      const $ = cheerio.load(html);

      $('table tr').each((i, row) => {
        if (i === 0) return;
        const link = $(row).find('td a[href$=".xml"]').attr('href');
        if (link) allXmlUrls.push('https://www.senate.gov' + link);
      });
    } catch (err) {
      console.error(`Error fetching menu ${menuUrl}: ${err.message}`);
    }
  }

  console.log(`Found ${allXmlUrls.length} Senate vote XML files across both sessions`);

  const totalVotes = allXmlUrls.length;
  const voteCounts = {};
  rankings.forEach(s => {
    voteCounts[s.bioguideId] = { yea: 0, nay: 0, missed: 0 };
  });

  // Process each vote XML
  for (const xmlUrl of allXmlUrls) {
    console.log(`Processing vote XML: ${xmlUrl}`);
    try {
      const xmlRes = await fetchWithRetry(xmlUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'application/xml,text/xml;q=0.9,*/*;q=0.8',
          'Connection': 'keep-alive'
        }
      });

      const xml = await xmlRes.text();
      const parsed = await parser.parseStringPromise(xml);

      const members = parsed.roll_call_vote?.members?.member || [];
      for (const m of members) {
        const name = (m.first_name + ' ' + m.last_name).trim();
        const party = (m.party || '').toLowerCase();
        const state = m.state;
        const voteCast = (m.vote_cast || '').trim().toLowerCase();

        const senator = rankings.find(s =>
          s.name.toLowerCase().includes(name.toLowerCase()) &&
          s.party.toLowerCase() === party &&
          s.state === state
        );

        if (!senator) continue;

        const counts = voteCounts[senator.bioguideId];
        if (voteCast === 'yea' || voteCast === 'yes') counts.yea++;
        else if (voteCast === 'nay' || voteCast === 'no') counts.nay++;
        else counts.missed++;
      }

      await delay(3000); // polite delay per XML
    } catch (err) {
      console.error(`Error on ${xmlUrl}: ${err.message}`);
    }
  }

  // Update rankings with tallies
  rankings.forEach(sen => {
    const counts = voteCounts[sen.bioguideId] || { yea: 0, nay: 0, missed: 0 };
    sen.yeaVotes = counts.yea;
    sen.nayVotes = counts.nay;
    sen.missedVotes = counts.missed;
    sen.totalVotes = totalVotes;
    sen.participationPct =
      totalVotes > 0 ? ((counts.yea + counts.nay) / totalVotes * 100).toFixed(2) : '0.00';
    sen.missedVotePct =
      totalVotes > 0 ? (counts.missed / totalVotes * 100).toFixed(2) : '0.00';
  });

  fs.writeFileSync(RANKINGS_PATH, JSON.stringify(rankings, null, 2));
  console.log(`Senate votes updated: ${totalVotes} roll calls processed across both sessions`);
}

scrapeSenateVotes().catch(err => console.error('Senate votes scraper failed:', err.message));
