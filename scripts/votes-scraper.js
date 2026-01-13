// votes-scraper.js
// Scrapes Senate roll call votes for ALL sessions of the 119th Congress
// Outputs public/senators-votes.json

const fs = require('fs');
const fetch = require('node-fetch');
const { XMLParser } = require('fast-xml-parser');

const legislators = JSON.parse(fs.readFileSync('public/legislators-current.json', 'utf8'));
const senators = legislators.filter(l => l.terms.some(t => t.type === 'sen'));

const BASE_URL = 'https://www.senate.gov/legislative/LIS/roll_call_votes/vote119';

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });

async function fetchXML(url) {
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`Failed to fetch ${url}: ${res.status}`);
    return null;
  }
  const text = await res.text();
  try {
    return parser.parse(text);
  } catch (err) {
    console.error(`XML parse error for ${url}: ${err.message}`);
    return null;
  }
}

async function scrapeVotes() {
  const sessions = [1, 2];
  const voteRecords = {};

  for (const session of sessions) {
    const indexUrl = `${BASE_URL}/vote_menu_119_${session}.xml`;
    console.log(`Fetching vote index: ${indexUrl}`);
    const indexData = await fetchXML(indexUrl);
    if (!indexData || !indexData.VoteMenu || !indexData.VoteMenu.Vote) continue;

    const votes = indexData.VoteMenu.Vote;
    console.log(`Found ${votes.length} votes in session ${session}`);

    let count = 0;
    for (const v of votes) {
      count++;
      const voteNumber = v.VoteNumber;
      const voteUrl = `${BASE_URL}/${session}/vote_${voteNumber}/vote.xml`;

      console.log(`Fetching vote ${voteNumber} (${count}/${votes.length}) from session ${session}`);
      const voteData = await fetchXML(voteUrl);
      if (!voteData || !voteData.rollcall_vote || !voteData.rollcall_vote.members) continue;

      const members = voteData.rollcall_vote.members.member || [];
      for (const m of members) {
        const bioguideId = m.id;
        if (!bioguideId) continue;

        if (!voteRecords[bioguideId]) {
          voteRecords[bioguideId] = { votesCast: 0, missedVotes: 0 };
        }

        const voteCast = m.vote_cast;
        if (voteCast === 'Not Voting') {
          voteRecords[bioguideId].missedVotes++;
        } else {
          voteRecords[bioguideId].votesCast++;
        }
      }
    }
  }

  // Build output
  const output = senators.map(sen => {
    const bioguideId = sen.id.bioguide;
    const record = voteRecords[bioguideId] || { votesCast: 0, missedVotes: 0 };
    const total = record.votesCast + record.missedVotes;
    const missedPct = total > 0 ? (record.missedVotes / total) * 100 : 0;

    return {
      bioguideId,
      votesCast: record.votesCast,
      missedVotes: record.missedVotes,
      missedPct: +missedPct.toFixed(2)
    };
  });

  fs.writeFileSync('public/senators-votes.json', JSON.stringify(output, null, 2));
  console.log('Votes scraper complete!');
}

scrapeVotes().catch(err => console.error(err));
