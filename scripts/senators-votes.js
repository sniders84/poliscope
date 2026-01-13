const fs = require('fs');
const fetch = require('node-fetch');

const API_KEY = '7154f715d925f15a41dfd20be7b8ce0a';
const CONGRESS_YEAR = 119;

const base = JSON.parse(fs.readFileSync('public/senators-rankings.json', 'utf8'));

// LegiScan leg_id map (add all; start with these - look up missing ones on legiscan.com/legislators)
const legIdMap = {
  'B001319': 4659, // Katie Britt
  'T000278': 4658, // Tommy Tuberville
  'M001153': 300075, // Lisa Murkowski
  'S001198': 412668, // Dan Sullivan
  'G000003': 4657, // Ruben Gallego (confirm)
  'K000377': 4656, // Mark Kelly
  // Add Cory Booker: 300006, Elizabeth Warren: 412542, etc.
  // If missing, script logs and sets 0
};

async function getVotes(legId) {
  if (!legId) return { missedVotes: 0, totalVotes: 0 };

  const url = `https://api.legiscan.com/?key=${API_KEY}&op=getLegislatorVotes&id=${legId}&year=${CONGRESS_YEAR}`;
  const res = await fetch(url);
  if (!res.ok) return { missedVotes: 0, totalVotes: 0 };

  const data = await res.json();
  if (data.status !== 'OK') return { missedVotes: 0, totalVotes: 0 };

  const votes = data.votes || [];
  let missed = 0;
  votes.forEach(v => {
    if (v.vote_position === 'Not Voting') missed++;
  });

  return { missedVotes: missed, totalVotes: votes.length };
}

async function main() {
  const output = [];

  for (const sen of base) {
    const legId = legIdMap[sen.bioguideId];
    if (!legId) {
      console.log(`No LegiScan ID for ${sen.name}`);
      output.push({ name: sen.name, missedVotes: 0, totalVotes: 0 });
      continue;
    }

    const { missedVotes, totalVotes } = await getVotes(legId);
    output.push({ name: sen.name, missedVotes, totalVotes });
    console.log(`${sen.name}: missed ${missedVotes}, total ${totalVotes}`);
  }

  fs.writeFileSync('public/senators-votes.json', JSON.stringify(output, null, 2));
  console.log('senators-votes.json updated!');
}

main().catch(console.error);
