// scripts/votes-scraper.js
// Scrape Senate roll call votes from LIS vote menu pages (both sessions of 119th)
// Parses XML per vote for member yea/nay/not-voting

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

let rankings = [];
try {
  rankings = JSON.parse(fs.readFileSync(RANKINGS_PATH, 'utf8'));
} catch (err) {
  console.error('Failed to load senators-rankings.json:', err.message);
  process.exit(1);
}

const senatorMap = new Map(rankings.map(s => [s.bioguideId, s]));

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrapeSenateVotes() {
  let allXmlUrls = [];

  for (const menuUrl of MENU_URLS) {
    console.log(`Fetching Senate vote menu: ${menuUrl}`);

    const res = await fetch(menuUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!res.ok) {
      console.error(`Menu fetch failed: ${res.status} for ${menuUrl}`);
      continue;
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    $('table tr').each((i, row) => {
      if (i === 0) return;
      const link = $(row).find('td a[href$=".xml"]').attr('href');
      if (link) allXmlUrls.push('https://www.senate.gov' + link);
    });
  }

  console.log(`Found ${allXmlUrls.length} Senate vote XML files across both sessions`);

  let totalVotes = allXmlUrls.length;
  let voteCounts = {};
  rankings.forEach(s => {
    voteCounts[s.bioguideId] = { yea: 0, nay: 0, missed: 0 };
  });

  for (const xmlUrl of allXmlUrls) {
    console.log(`Processing vote XML: ${xmlUrl}`);
    try {
      const xmlRes = await fetch(xmlUrl);
      if (!xmlRes.ok) continue;

      const xml = await xmlRes.text();
      const parsed = await parser.parseStringPromise(xml);

      const members = parsed.roll_call_vote?.members?.member || [];
      for (const m of members) {
        const name = (m.first_name + ' ' + m.last_name).trim();
        const party = m.party;
        const state = m.state;
        const voteCast = (m.vote_cast || '').trim().toLowerCase();

        // Match senator (name + party + state fallback)
        const senator = rankings.find(s => {
          return s.name.toLowerCase().includes(name.toLowerCase()) &&
                 s.party.toLowerCase() === party.toLowerCase() &&
                 s.state === state;
        });

        if (!senator) continue;

        const counts = voteCounts[senator.bioguideId];
        if (voteCast === 'yea' || voteCast === 'yes') counts.yea++;
        else if (voteCast === 'nay' || voteCast === 'no') counts.nay++;
        else counts.missed++;
      }

      await delay(3000); // 3s delay per XML to be polite
    } catch (err) {
      console.error(`Error on ${xmlUrl}: ${err.message}`);
    }
  }

  rankings.forEach(sen => {
    const counts = voteCounts[sen.bioguideId] || { yea: 0, nay: 0, missed: 0 };
    sen.yeaVotes = counts.yea;
    sen.nayVotes = counts.nay;
    sen.missedVotes = counts.missed;
    sen.totalVotes = totalVotes;
    sen.participationPct = totalVotes > 0 ? ((counts.yea + counts.nay) / totalVotes * 100).toFixed(2) : 0;
    sen.missedVotePct = totalVotes > 0 ? (counts.missed / totalVotes * 100).toFixed(2) : 0;
  });

  fs.writeFileSync(RANKINGS_PATH, JSON.stringify(rankings, null, 2));
  console.log(`Senate votes updated: ${totalVotes} roll calls processed across both sessions`);
}

scrapeSenateVotes().catch(err => console.error('Senate votes scraper failed:', err.message));
