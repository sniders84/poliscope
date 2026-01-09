const fs = require('fs');
const fetch = require('node-fetch');
const { parseStringPromise } = require('xml2js');

const baseData = JSON.parse(fs.readFileSync('public/senators-rankings.json', 'utf8'));
const jsonPath = 'public/senators-votes.json';

async function fetchVoteIndex(session) {
  const url = `https://www.senate.gov/legislative/LIS/roll_call_lists/vote_menu_119_${session}.xml`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const xml = await res.text();
  const parsed = await parseStringPromise(xml);
  return parsed.roll_call_vote_menu.vote_number.map(v => v._);
}

async function fetchVoteDetail(session, voteNum) {
  const num = voteNum.padStart(5, '0');
  const url = `https://www.senate.gov/legislative/LIS/roll_call_votes/vote119${session}/vote_119_${session}_${num}.xml`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const xml = await res.text();
  return await parseStringPromise(xml);
}

async function buildMissedVotes(allNames) {
  const missed = Object.fromEntries(allNames.map(n => [n, 0]));

  for (const session of ['1', '2']) {
    const voteNums = await fetchVoteIndex(session);
    for (const num of voteNums) {
      const detail = await fetchVoteDetail(session, num);
      if (!detail || !detail.roll_call_vote || !detail.roll_call_vote.members) continue;
      const members = detail.roll_call_vote.members[0].member;
      members.forEach(m => {
        const name = `${m.last_name[0]}, ${m.first_name[0]}`.trim();
        if (allNames.includes(name) && m.vote_cast[0] === 'Not Voting') {
          missed[name] = (missed[name] || 0) + 1;
        }
      });
    }
  }

  return missed;
}

(async () => {
  const allNames = baseData.map(s => s.name);
  const missedLookup = await buildMissedVotes(allNames);

  const output = baseData.map(s => ({
    name: s.name,
    bioguideId: s.bioguideId,
    missedVotes: missedLookup[s.name] || 0
  }));

    fs.writeFileSync(jsonPath, JSON.stringify(output, null, 2) + '\n');
  console.log('senators-votes.json fully updated!');
})();

