const fs = require('fs');
const fetch = require('node-fetch');
const xml2js = require('xml2js');

const INDEX_URLS = [
  'https://www.senate.gov/legislative/LIS/roll_call_lists/vote_menu_119_1.xml',
  'https://www.senate.gov/legislative/LIS/roll_call_lists/vote_menu_119_2.xml'
];

async function fetchXML(url) {
  const res = await fetch(url);
  const text = await res.text();
  return await xml2js.parseStringPromise(text);
}

async function scrapeVotes() {
  const senators = {};

  for (const indexUrl of INDEX_URLS) {
    const indexData = await fetchXML(indexUrl);

    const voteMenu = indexData.vote_menu || indexData.Vote_Menu;
    if (!voteMenu) {
      console.error(`No vote_menu found in ${indexUrl}`);
      continue;
    }

    const votes = voteMenu.vote || voteMenu.Vote;
    if (!votes) {
      console.error(`No vote array found in ${indexUrl}`);
      continue;
    }

    for (const v of votes) {
      const voteNum = v.vote_number[0];
      const congress = v.congress[0]; // "119"
      const session = v.session[0];   // "1" or "2"
      const detailUrl = `https://www.senate.gov/legislative/LIS/roll_call_votes/vote${congress}${session}/vote_${voteNum}.xml`;

      try {
        const detailData = await fetchXML(detailUrl);
        const members = detailData.roll_call_vote.members[0].member;
        for (const m of members) {
          const name = `${m.last_name[0]}, ${m.first_name[0]}`;
          const position = m.vote_cast[0];
          if (!senators[name]) {
            senators[name] = { name, missedVotes: 0, totalVotes: 0 };
          }
          senators[name].totalVotes++;
          if (/Not Voting/i.test(position)) {
            senators[name].missedVotes++;
          }
        }
      } catch (err) {
        console.error(`Failed to fetch vote ${voteNum} from ${congress}-${session}:`, err.message);
      }
    }
  }

  fs.writeFileSync('public/senators-votes.json', JSON.stringify(Object.values(senators), null, 2));
  console.log('senators-votes.json fully updated!');
}

scrapeVotes().catch(err => {
  console.error(err);
  process.exit(1);
});
