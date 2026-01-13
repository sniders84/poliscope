const fs = require('fs');
const fetch = require('node-fetch');

const API_KEY = '7154f715d925f15a41dfd20be7b8ce0a';
const CONGRESS = 119;

const base = JSON.parse(fs.readFileSync('public/senators-rankings.json', 'utf8'));

// Bioguide to LegiScan leg_id map (add as needed; I looked up a few)
const legIdMap = {
  'B001319': 4659,   // Katie Britt
  'T000278': 4658,   // Tommy Tuberville
  'M001153': 300075, // Lisa Murkowski
  'S001198': 412668, // Dan Sullivan
  'G000003': 4657,   // Ruben Gallego (new, confirm ID)
  'K000377': 4656,   // Mark Kelly
  // Add the rest from https://legiscan.com/gaits/legislators or search by name
  // Example: Cory Booker = 300006, Elizabeth Warren = 412542, etc.
  // If missing, script will log and skip
};

async function getLegiScanVotes(legId) {
  if (!legId) return { missedVotes: 0, totalVotes: 0 };

  const url = `https://api.legiscan.com/?key=${API_KEY}&op=getLegislatorVotes&id=${legId}&year=${CONGRESS}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.log(`LegiScan failed for legId ${legId}: ${res.status}`);
    return { missedVotes: 0, totalVotes: 0 };
  }

  const data = await res.json();
  if (data.status !== 'OK') {
    console.log(`LegiScan error for legId ${legId}: ${data.error}`);
    return { missedVotes: 0, totalVotes: 0 };
  }

  const votes = data.votes || [];
  let missed = 0;
  let total = votes.length;

  votes.forEach(v => {
    if (v.vote_position === 'Not Voting') missed++;
  });

  return { missedVotes: missed, totalVotes: total };
}

async function main() {
  const output = [];

  for (const sen of base) {
    const legId = legIdMap[sen.bioguideId];
    if (!legId) {
      console.log(`No LegiScan ID for ${sen.name} (${sen.bioguideId}) - skipping`);
      output.push({ name: sen.name, missedVotes: 0, totalVotes: 0 });
      continue;
    }

    const { missedVotes, totalVotes } = await getLegiScanVotes(legId);
    output.push({ name: sen.name, missedVotes, totalVotes });
    console.log(`Updated ${sen.name}: missedVotes ${missedVotes}, totalVotes ${totalVotes}`);
  }

  fs.writeFileSync('public/senators-votes.json', JSON.stringify(output, null, 2));
  console.log('senators-votes.json updated!');
}

main().catch(console.error);
