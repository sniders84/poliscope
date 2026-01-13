// votes-scraper.js
// Scrapes Senate roll call votes for ALL sessions of the current Congress (119th)
// Outputs public/senators-votes.json

const fs = require('fs');
const fetch = require('node-fetch');
const xml2js = require('xml2js');

const legislators = JSON.parse(fs.readFileSync('public/legislators-current.json', 'utf8'));
const senators = legislators.filter(l => l.terms.some(t => t.type === 'sen'));

const BASE_URL = 'https://www.senate.gov/legislative/LIS/roll_call_votes/vote119';

async function fetchXML(url) {
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`Failed to fetch ${url}: ${res.status}`);
    return null;
  }
  let text = await res.text();

  // Sanitize malformed XML characters
  text = text
    .replace(/&(?!(amp;|lt;|gt;|quot;|apos;))/g, '&amp;') // fix stray &
    .replace(/<\s+/g, '<') // remove spaces after <
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ''); // strip control chars

  try {
    return await xml2js.parseStringPromise(text, { explicitArray: true });
  } catch (err) {
    console.error(`XML parse error for ${url}: ${err.message}`);
    return null;
  }
}

async function scrapeVotes() {
  const sessions = [1, 2]; // both sessions of 119th Congress
  const voteRecords = {};

  for (const session of sessions) {
    const indexUrl = `${BASE_URL}/vote_menu_119_${session}.xml`;
    console.log(`Fetching vote index: ${indexUrl}`);
    const indexData = await fetchXML(indexUrl);
    if (!indexData || !indexData.VoteMenu) continue;

    const votes = indexData.VoteMenu.Vote || [];
    console.log(`Found ${votes.length} votes in session ${session}`);

    let count = 0;
    for (const v of votes) {
      count++;
      const voteNumber = v.VoteNumber[0];
      const voteUrl = `${BASE_URL}/${session}/vote_${voteNumber}/vote.xml`;

      console.log(`Fetching vote ${voteNumber} (${count}/${votes.length}) from session ${session}`);
      const voteData = await fetchXML(voteUrl);
      if (!voteData || !voteData.rollcall_vote) continue;

      const members = voteData.rollcall_vote.members[0].member || [];
      for (const m of members) {
        const bioguideId = m.$.id;
        if (!bioguideId) continue;

        if (!voteRecords[bioguideId]) {
          voteRecords[bioguideId] = { votesCast: 0, missedVotes: 0 };
        }

        const voteCast = m.vote_cast[0];
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
