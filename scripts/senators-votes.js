// votes-scraper.js
// Scrapes Senate.gov roll call XML indexes
// Outputs senators-votes.json

const fs = require('fs');
const fetch = require('node-fetch');
const xml2js = require('xml2js');

const ROLL_CALL_BASE = 'https://www.senate.gov/legislative/LIS/roll_call_votes/vote119'; 
// Example: vote1191.xml, vote1192.xml etc. (1st and 2nd sessions)

async function fetchRollCall(congress, session, voteNumber) {
  const url = `${ROLL_CALL_BASE}${session}/vote_${congress}_${session}_${voteNumber}.xml`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const xml = await res.text();
  return xml2js.parseStringPromise(xml);
}

async function scrapeVotes() {
  const senators = JSON.parse(fs.readFileSync('senators.json', 'utf8'));
  const voteData = {};

  // Loop through sessions (1 and 2) and vote numbers
  for (let session = 1; session <= 2; session++) {
    for (let voteNum = 1; voteNum <= 1000; voteNum++) { // upper bound, break when no file
      const data = await fetchRollCall(119, session, voteNum);
      if (!data) break;

      const members = data.rollcall.vote[0].members[0].member;
      for (const m of members) {
        const bioguideId = m.$.member_id;
        const voteCast = m.vote[0];

        if (!voteData[bioguideId]) {
          voteData[bioguideId] = { votesCast: 0, missedVotes: 0 };
        }

        if (/Not Voting/i.test(voteCast)) {
          voteData[bioguideId].missedVotes++;
        } else {
          voteData[bioguideId].votesCast++;
        }
      }
    }
  }

  const output = senators.map(sen => {
    const stats = voteData[sen.bioguideId] || { votesCast: 0, missedVotes: 0 };
    const total = stats.votesCast + stats.missedVotes;
    const missedPct = total > 0 ? (stats.missedVotes / total) * 100 : 0;

    return {
      bioguideId: sen.bioguideId,
      votesCast: stats.votesCast,
      missedVotes: stats.missedVotes,
      missedPct: Math.round(missedPct * 10) / 10
    };
  });

  fs.writeFileSync('senators-votes.json', JSON.stringify(output, null, 2));
  console.log('Votes scraper complete!');
}

scrapeVotes().catch(err => console.error(err));
