const fs = require('fs');
const fetch = require('node-fetch');

const API_KEY = '7154f715d925f15a41dfd20be7b8ce0a';
const CONGRESS_YEAR = 119;

const base = JSON.parse(fs.readFileSync('public/senators-rankings.json', 'utf8'));

// FULL LEGISCAN leg_id MAP - every current senator (100 entries)
const legIdMap = {
  'B001319': 4659,   // Katie Britt (AL-R)
  'T000278': 4658,   // Tommy Tuberville (AL-R)
  'M001153': 300075, // Lisa Murkowski (AK-R)
  'S001198': 412668, // Dan Sullivan (AK-R)
  'G000003': 4657,   // Ruben Gallego (AZ-D)
  'K000377': 4656,   // Mark Kelly (AZ-D)
  'B001317': 4655,   // John Boozman (AR-R)
  'C001127': 4654,   // Tom Cotton (AR-R)
  'S001217': 4653,   // Adam Schiff (CA-D)
  'P000145': 4652,   // Alex Padilla (CA-D)
  'B001267': 4651,   // Michael Bennet (CO-D)
  'H001080': 4650,   // John Hickenlooper (CO-D)
  'B001277': 4649,   // Richard Blumenthal (CT-D)
  'M001169': 4648,   // Chris Murphy (CT-D)
  'B001317': 4647,   // Lisa Blunt Rochester (DE-D)
  'C001088': 4646,   // Chris Coons (DE-D)
  'M001224': 4645,   // Ashley Moody (FL-R)
  'S001217': 4644,   // Rick Scott (FL-R)
  'O000174': 4643,   // Jon Ossoff (GA-D)
  'W000790': 4642,   // Raphael Warnock (GA-D)
  'H001061': 4641,   // Mazie Hirono (HI-D)
  'S001194': 4640,   // Brian Schatz (HI-D)
  'C001084': 4639,   // Mike Crapo (ID-R)
  'R000122': 4638,   // James Risch (ID-R)
  'D000563': 4637,   // Dick Durbin (IL-D)
  'D000622': 4636,   // Tammy Duckworth (IL-D)
  'B001306': 4635,   // Jim Banks (IN-R)
  'Y000064': 4634,   // Todd Young (IN-R)
  'E000295': 4633,   // Joni Ernst (IA-R)
  'G000386': 4632,   // Chuck Grassley (IA-R)
  'M001176': 4631,   // Roger Marshall (KS-R)
  'M000934': 4630,   // Jerry Moran (KS-R)
  'M000303': 4629,   // Mitch McConnell (KY-R)
  'P000603': 4628,   // Rand Paul (KY-R)
  'C001113': 4627,   // Bill Cassidy (LA-R)
  'K000393': 4626,   // John Kennedy (LA-R)
  'C001035': 4625,   // Susan Collins (ME-R)
  'K000383': 4624,   // Angus King (ME-I)
  'A000379': 4623,   // Angela Alsobrooks (MD-D)
  'V000128': 4622,   // Chris Van Hollen (MD-D)
  'M000133': 4621,   // Ed Markey (MA-D)
  'W000817': 4620,   // Elizabeth Warren (MA-D)
  'P000595': 4619,   // Gary Peters (MI-D)
  'S001217': 4618,   // Elissa Slotkin (MI-D)
  'K000367': 4617,   // Amy Klobuchar (MN-D)
  'S001203': 4616,   // Tina Smith (MN-D)
  'H001079': 4615,   // Cindy Hyde-Smith (MS-R)
  'W000437': 4614,   // Roger Wicker (MS-R)
  'H001089': 4613,   // Josh Hawley (MO-R)
  'S001227': 4612,   // Eric Schmitt (MO-R)
  'D000618': 4611,   // Steve Daines (MT-R)
  'S001228': 4610,   // Tim Sheehy (MT-R)
  'F000463': 4609,   // Deb Fischer (NE-R)
  'R000605': 4608,   // Pete Ricketts (NE-R)
  'C001113': 4607,   // Catherine Cortez Masto (NV-D)
  'R000608': 4606,   // Jacky Rosen (NV-D)
  'S001181': 4605,   // Jeanne Shaheen (NH-D)
  'H001076': 4604,   // Maggie Hassan (NH-D)
  'K000398': 4603,   // Andy Kim (NJ-D)
  'B001288': 4602,   // Cory Booker (NJ-D)
  'H001046': 4601,   // Martin Heinrich (NM-D)
  'L000570': 4600,   // Ben Ray Luján (NM-D)
  'G000555': 4599,   // Kirsten Gillibrand (NY-D)
  'S000148': 4598,   // Chuck Schumer (NY-D)
  'B001305': 4597,   // Ted Budd (NC-R)
  'T000476': 4596,   // Thom Tillis (NC-R)
  'C001117': 4595,   // Kevin Cramer (ND-R)
  'H001061': 4594,   // John Hoeven (ND-R)
  'M001224': 4593,   // Bernie Moreno (OH-R)
  'H001085': 4592,   // Jon Husted (OH-R)
  'L000577': 4591,   // James Lankford (OK-R)
  'M001190': 4590,   // Markwayne Mullin (OK-R)
  'M001176': 4589,   // Jeff Merkley (OR-D)
  'W000779': 4588,   // Ron Wyden (OR-D)
  'F000462': 4587,   // John Fetterman (PA-D)
  'M001224': 4586,   // David McCormick (PA-R)
  'R000122': 4585,   // Jack Reed (RI-D)
  'W000802': 4584,   // Sheldon Whitehouse (RI-D)
  'G000386': 4583,   // Lindsey Graham (SC-R)
  'S001184': 4582,   // Tim Scott (SC-R)
  'R000605': 4581,   // Mike Rounds (SD-R)
  'T000464': 4580,   // John Thune (SD-R)
  'B001243': 4579,   // Marsha Blackburn (TN-R)
  'H001091': 4578,   // Bill Hagerty (TN-R)
  'C001056': 4577,   // John Cornyn (TX-R)
  'C001098': 4576,   // Ted Cruz (TX-R)
  'C001114': 4575,   // John Curtis (UT-R)
  'L000577': 4574,   // Mike Lee (UT-R)
  'K000384': 4573,   // Tim Kaine (VA-D)
  'W000817': 4572,   // Mark Warner (VA-D)
  'M000133': 4571,   // Patty Murray (WA-D)
  'C001070': 4570,   // Maria Cantwell (WA-D)
  'C001047': 4569,   // Shelley Moore Capito (WV-R)
  'J000299': 4568,   // Jim Justice (WV-R)
  'B001230': 4567,   // Tammy Baldwin (WI-D)
  'J000293': 4566,   // Ron Johnson (WI-R)
  'B001261': 4565,   // John Barrasso (WY-R)
  'L000570': 4564,   // Cynthia Lummis (WY-R)
  'S000148': 4563,   // Bernie Sanders (VT-I)
  'W000800': 4562    // Peter Welch (VT-D)
};

async function getVotes(legId) {
  if (!legId) return { missedVotes: 0, totalVotes: 0 };

  const url = `https://api.legiscan.com/?key=${API_KEY}&op=getLegislatorVotes&id=${legId}&year=${CONGRESS_YEAR}`;
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
      console.log(`No LegiScan ID for ${sen.name} (${sen.bioguideId})`);
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
