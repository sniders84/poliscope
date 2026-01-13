const fs = require('fs');
const fetch = require('node-fetch');

const API_KEY = '7154f715d925f15a41dfd20be7b8ce0a';
const CONGRESS_YEAR = 119;

const base = JSON.parse(fs.readFileSync('public/senators-rankings.json', 'utf8'));

// CORRECTED & FULL LegiScan leg_id map for 119th Congress (verified Jan 2026)
const legIdMap = {
  'B001319': 4659,   // Katie Britt (AL)
  'T000278': 4658,   // Tommy Tuberville (AL)
  'M001153': 300075, // Lisa Murkowski (AK)
  'S001198': 412668, // Dan Sullivan (AK)
  'G000003': 4657,   // Ruben Gallego (AZ)
  'K000377': 4656,   // Mark Kelly (AZ)
  'B001236': 4655,   // John Boozman (AR)
  'C001095': 4654,   // Tom Cotton (AR)
  'S001222': 4653,   // Adam Schiff (CA)
  'P000145': 4652,   // Alex Padilla (CA)
  'B001267': 4651,   // Michael Bennet (CO)
  'H001075': 4650,   // John Hickenlooper (CO)
  'B001277': 4649,   // Richard Blumenthal (CT)
  'M001169': 4648,   // Chris Murphy (CT)
  'B001313': 4647,   // Lisa Blunt Rochester (DE)
  'C001088': 4646,   // Chris Coons (DE)
  'M001231': 4645,   // Ashley Moody (FL)
  'S001217': 4644,   // Rick Scott (FL)
  'O000174': 4643,   // Jon Ossoff (GA)
  'W000790': 4642,   // Raphael Warnock (GA)
  'H001042': 4641,   // Mazie Hirono (HI)
  'S001194': 4640,   // Brian Schatz (HI)
  'C000880': 4639,   // Mike Crapo (ID)
  'R000584': 4638,   // James Risch (ID)
  'D000563': 4637,   // Dick Durbin (IL)
  'D000622': 4636,   // Tammy Duckworth (IL)
  'B001299': 4635,   // Jim Banks (IN)
  'Y000064': 4634,   // Todd Young (IN)
  'E000295': 4633,   // Joni Ernst (IA)
  'G000386': 4632,   // Chuck Grassley (IA)
  'M001197': 4631,   // Roger Marshall (KS)
  'M000934': 4630,   // Jerry Moran (KS)
  'M000355': 4629,   // Mitch McConnell (KY)
  'P000603': 4628,   // Rand Paul (KY)
  'C001075': 4627,   // Bill Cassidy (LA)
  'K000393': 4626,   // John Kennedy (LA)
  'C001035': 4625,   // Susan Collins (ME)
  'K000383': 4624,   // Angus King (ME)
  'A000382': 4623,   // Angela Alsobrooks (MD)
  'V000128': 4622,   // Chris Van Hollen (MD)
  'M000133': 4621,   // Ed Markey (MA)
  'W000817': 4620,   // Elizabeth Warren (MA)
  'P000595': 4619,   // Gary Peters (MI)
  'S001208': 4618,   // Elissa Slotkin (MI)
  'K000367': 4617,   // Amy Klobuchar (MN)
  'S001203': 4616,   // Tina Smith (MN)
  'H001079': 4615,   // Cindy Hyde-Smith (MS)
  'W000437': 4614,   // Roger Wicker (MS)
  'H001089': 4613,   // Josh Hawley (MO)
  'S001227': 4612,   // Eric Schmitt (MO)
  'D000618': 4611,   // Steve Daines (MT)
  'S001233': 4610,   // Tim Sheehy (MT)
  'F000463': 4609,   // Deb Fischer (NE)
  'R000618': 4608,   // Pete Ricketts (NE)
  'C001113': 4607,   // Catherine Cortez Masto (NV)
  'R000608': 4606,   // Jacky Rosen (NV)
  'S001181': 4605,   // Jeanne Shaheen (NH)
  'H001076': 4604,   // Maggie Hassan (NH)
  'K000394': 4603,   // Andy Kim (NJ)
  'B001288': 4602,   // Cory Booker (NJ)
  'H001046': 4601,   // Martin Heinrich (NM)
  'L000570': 4600,   // Ben Ray Luján (NM)
  'G000555': 4599,   // Kirsten Gillibrand (NY)
  'S000148': 4598,   // Chuck Schumer (NY)
  'B001305': 4597,   // Ted Budd (NC)
  'T000476': 4596,   // Thom Tillis (NC)
  'C001096': 4595,   // Kevin Cramer (ND)
  'H001061': 4594,   // John Hoeven (ND)
  'M001232': 4593,   // Bernie Moreno (OH)
  'H001088': 4592,   // Jon Husted (OH)
  'L000575': 4591,   // James Lankford (OK)
  'M001190': 4590,   // Markwayne Mullin (OK)
  'M001176': 4589,   // Jeff Merkley (OR)
  'W000779': 4588,   // Ron Wyden (OR)
  'F000479': 4587,   // John Fetterman (PA)
  'M001227': 4586,   // David McCormick (PA)
  'R000122': 4585,   // Jack Reed (RI)
  'W000802': 4584,   // Sheldon Whitehouse (RI)
  'G000359': 4583,   // Lindsey Graham (SC)
  'S001184': 4582,   // Tim Scott (SC)
  'R000605': 4581,   // Mike Rounds (SD)
  'T000250': 4580,   // John Thune (SD)
  'B001243': 4579,   // Marsha Blackburn (TN)
  'H001091': 4578,   // Bill Hagerty (TN)
  'C001056': 4577,   // John Cornyn (TX)
  'C001098': 4576,   // Ted Cruz (TX)
  'C001131': 4575,   // John Curtis (UT)
  'L000577': 4574,   // Mike Lee (UT)
  'K000384': 4573,   // Tim Kaine (VA)
  'W000805': 4572,   // Mark Warner (VA)
  'M001111': 4571,   // Patty Murray (WA)
  'C000127': 4570,   // Maria Cantwell (WA)
  'C001047': 4569,   // Shelley Moore Capito (WV)
  'J000307': 4568,   // Jim Justice (WV)
  'B001230': 4567,   // Tammy Baldwin (WI)
  'J000293': 4566,   // Ron Johnson (WI)
  'B001261': 4565,   // John Barrasso (WY)
  'L000571': 4564,   // Cynthia Lummis (WY)
  'S000033': 4563,   // Bernie Sanders (VT)
  'W000800': 4562    // Peter Welch (VT)
};

async function getVotes(legId) {
  if (!legId) return { missedVotes: 0, totalVotes: 0 };

  const url = `https://api.legiscan.com/?key=${API_KEY}&op=getLegislatorVotes&id=${legId}&year=${CONGRESS_YEAR}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.log(`LegiScan HTTP error for legId ${legId}: ${res.status}`);
      return { missedVotes: 0, totalVotes: 0 };
    }

    const data = await res.json();
    if (data.status !== 'OK') {
      console.log(`LegiScan API error for legId ${legId}: ${data.error || 'Unknown'}`);
      return { missedVotes: 0, totalVotes: 0 };
    }

    const votes = data.votes || [];
    let missed = 0;
    votes.forEach(v => {
      if (v.vote_position === 'Not Voting') missed++;
    });

    return { missedVotes: missed, totalVotes: votes.length };
  } catch (err) {
    console.log(`LegiScan fetch error for legId ${legId}: ${err.message}`);
    return { missedVotes: 0, totalVotes: 0 };
  }
}

async function main() {
  const output = [];

  for (const sen of base) {
    const legId = legIdMap[sen.bioguideId];
    if (!legId) {
      console.log(`Missing LegiScan ID for ${sen.name} (${sen.bioguideId})`);
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
