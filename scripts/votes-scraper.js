const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const xml2js = require('xml2js').parseStringPromise;

const RANKINGS_PATH = path.join(__dirname, '../public/senators-rankings.json');

const SESSION_RANGES = {
  1: { start: 1, end: 658 },
  2: { start: 1, end: 100 }
};

// Hard-coded LIS ID to name map from senate.gov XML
const LIS_TO_NAME_MAP = {
  'S428': 'Angela Alsobrooks',
  'S354': 'Tammy Baldwin',
  'S429': 'Jim Banks',
  'S317': 'John Barrasso',
  'S330': 'Michael Bennet',
  'S396': 'Marsha Blackburn',
  'S341': 'Richard Blumenthal',
  'S430': 'Lisa Blunt Rochester',
  'S370': 'Cory Booker',
  'S343': 'John Boozman',
  'S416': 'Katie Britt',
  'S417': 'Ted Budd',
  'S275': 'Maria Cantwell',
  'S372': 'Shelley Moore Capito',
  'S373': 'Bill Cassidy',
  'S252': 'Susan Collins',
  'S337': 'Chris Coons',
  'S287': 'John Cornyn',
  'S385': 'Catherine Cortez Masto',
  'S374': 'Tom Cotton',
  'S398': 'Kevin Cramer',
  'S266': 'Mike Crapo',
  'S355': 'Ted Cruz',
  'S431': 'John Curtis',
  'S375': 'Steve Daines',
  'S386': 'Tammy Duckworth',
  'S253': 'Dick Durbin',
  'S376': 'Joni Ernst',
  'S418': 'John Fetterman',
  'S357': 'Deb Fischer',
  'S432': 'Ruben Gallego',
  'S331': 'Kirsten Gillibrand',
  'S293': 'Lindsey Graham',
  'S153': 'Chuck Grassley',
  'S407': 'Bill Hagerty',
  'S388': 'Maggie Hassan',
  'S399': 'Josh Hawley',
  'S359': 'Martin Heinrich',
  'S408': 'John Hickenlooper',
  'S361': 'Mazie Hirono',
  'S344': 'John Hoeven',
  'S438': 'Jon Husted',
  'S395': 'Cindy Hyde-Smith',
  'S345': 'Ron Johnson',
  'S437': 'James Justice',
  'S362': 'Tim Kaine',
  'S406': 'Mark Kelly',
  'S389': 'John Kennedy',
  'S426': 'Andy Kim',
  'S363': 'Angus King',
  'S311': 'Amy Klobuchar',
  'S378': 'James Lankford',
  'S364': 'Mike Lee',
  'S413': 'Ben Ray Luján',
  'S401': 'Cynthia Lummis',
  'S342': 'Joe Manchin',
  'S315': 'Ed Markey',
  'S427': 'David McCormick',
  'S288': 'Mitch McConnell',
  'S307': 'Robert Menendez',
  'S322': 'Jeff Merkley',
  'S433': 'Bernie Moreno',
  'S402': 'Jerry Moran',
  'S414': 'Lisa Murkowski',
  'S303': 'Patty Murray',
  'S415': 'Markwayne Mullin',
  'S409': 'Jon Ossoff',
  'S410': 'Alex Padilla',
  'S402': 'Rand Paul',
  'S411': 'Gary Peters',
  'S434': 'Pete Ricketts',
  'S323': 'Jack Reed',
  'S279': 'James Risch',
  'S412': 'Jacky Rosen',
  'S377': 'Mike Rounds',
  'S381': 'Marco Rubio',
  'S347': 'Bernie Sanders',
  'S401': 'Brian Schatz',
  'S340': 'Chuck Schumer',
  'S387': 'Eric Schmitt',
  'S313': 'Tim Scott',
  'S348': 'Jeanne Shaheen',
  'S390': 'Tim Sheehy',
  'S321': 'Kyrsten Sinema',
  'S391': 'Tina Smith',
  'S320': 'Debbie Stabenow',
  'S419': 'Dan Sullivan',
  'S392': 'Jon Tester',
  'S349': 'John Thune',
  'S393': 'Thom Tillis',
  'S420': 'Tommy Tuberville',
  'S421': 'Chris Van Hollen',
  'S350': 'J.D. Vance',
  'S422': 'Raphael Warnock',
  'S351': 'Mark Warner',
  'S352': 'Elizabeth Warren',
  'S353': 'Peter Welch',
  'S314': 'Sheldon Whitehouse',
  'S379': 'Roger Wicker',
  'S423': 'Ron Wyden',
  'S424': 'Todd Young',
  // Add any missing from full list if needed
};

async function fetchVote(url) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) return null;
    const xml = await res.text();
    return await xml2js(xml, { trim: true, explicitArray: false });
  } catch {
    return null;
  }
}

async function parseVoteCounts(parsed, senatorMap, voteId) {
  const members = parsed?.roll_call_vote?.members?.member || [];
  const yea = [];
  const nay = [];
  const notVoting = [];
  const unmatched = [];

  members.forEach(m => {
    const voteCast = m.vote_cast?.trim() || 'Unknown';
    const lisId = m.lis_member_id?.trim();
    const state = (m.state || '').trim().toUpperCase();
    const party = (m.party || '').trim().toUpperCase();

    if (lisId && LIS_TO_NAME_MAP[lisId]) {
      const name = LIS_TO_NAME_MAP[lisId];
      if (senatorMap.has(name) || true) { // Assume name is key
        if (voteCast === 'Yea') yea.push(name);
        if (voteCast === 'Nay') nay.push(name);
        if (voteCast === 'Not Voting') notVoting.push(name);
        return;
      }
    }

    // Fallback to previous name match if LIS missing
    let xmlFull = (m.member_full || '').trim().toLowerCase();
    xmlFull = xmlFull.replace(/\s*\([d,r,i]-\w{2}\)\s*/i, '').trim();

    let matched = false;

    for (const senInfo of senatorMap.values()) {
      const senNameLower = senInfo.name.toLowerCase();
      const senState = senInfo.state?.toUpperCase() || '';
      const senParty = senInfo.party?.toUpperCase() || '';
      const senLastParts = senNameLower.split(' ').slice(-2);

      const lastMatch = senLastParts.some(part => xmlFull.includes(part));

      if (lastMatch &&
          (!senState || senState === state) &&
          (!senParty || senParty === party)) {
        if (voteCast === 'Yea') yea.push(senInfo.name);
        if (voteCast === 'Nay') nay.push(senInfo.name);
        if (voteCast === 'Not Voting') notVoting.push(senInfo.name);
        matched = true;
        break;
      }
    }

    if (!matched && voteCast !== 'Unknown') {
      unmatched.push(`${m.member_full} (${lisId || 'no_lis'}, ${state}-${party}, ${voteCast})`);
    }
  });

  console.log(`Vote ${voteId}: ${yea.length} Yea, ${nay.length} Nay, ${notVoting.length} Not Voting`);

  if (unmatched.length > 0) {
    console.log(`Unmatched in ${voteId}: ${unmatched.slice(0, 5).join(', ')}...`);
  }

  return { yea, nay, notVoting };
}

async function main() {
  console.log('Votes scraper: prioritize lis_member_id match + fallback');

  let rankings;
  try {
    rankings = JSON.parse(fs.readFileSync(RANKINGS_PATH, 'utf8'));
  } catch (err) {
    console.error('Failed to load rankings.json:', err.message);
    return;
  }

  const senatorMap = new Map();
  rankings.forEach(sen => {
    senatorMap.set(sen.name, sen); // Use name as key for simplicity
  });

  const voteCounts = {
    yea: {},
    nay: {},
    notVoting: {}
  };
  rankings.forEach(s => {
    voteCounts.yea[s.name] = 0;
    voteCounts.nay[s.name] = 0;
    voteCounts.notVoting[s.name] = 0;
  });

  let totalProcessed = 0;

  const promises = [];
  for (const [session, range] of Object.entries(SESSION_RANGES)) {
    for (let num = range.start; num <= range.end; num++) {
      const padded = num.toString().padStart(5, '0');
      const url = `https://www.senate.gov/legislative/LIS/roll_call_votes/vote119${session}/vote_119_${session}_${padded}.xml`;
      promises.push(
        fetchVote(url).then(parsed => {
          if (!parsed) return;
          totalProcessed++;
          const voteId = `vote_119_${session}_${padded}`;
          parseVoteCounts(parsed, senatorMap, voteId).then(counts => {
            counts.yea.forEach(name => voteCounts.yea[name]++);
            counts.nay.forEach(name => voteCounts.nay[name]++);
            counts.notVoting.forEach(name => voteCounts.notVoting[name]++);
          });
        })
      );
    }
  }

  await Promise.all(promises);

  rankings.forEach(sen => {
    const yea = voteCounts.yea[sen.name] || 0;
    const nay = voteCounts.nay[sen.name] || 0;
    const missed = voteCounts.notVoting[sen.name] || 0;
    sen.yeaVotes = yea;
    sen.nayVotes = nay;
    sen.missedVotes = missed;
    sen.totalVotes = totalProcessed;
    sen.missedVotePct = totalProcessed > 0 ? +((missed / totalProcessed) * 100).toFixed(2) : 0;
    sen.participationPct = totalProcessed > 0 ? +(((yea + nay) / totalProcessed) * 100).toFixed(2) : 0;
  });

  try {
    fs.writeFileSync(RANKINGS_PATH, JSON.stringify(rankings, null, 2));
    console.log(`Votes updated: ${totalProcessed} roll calls processed`);
  } catch (err) {
    console.error('Write error:', err.message);
  }
}

main().catch(err => console.error('Votes failed:', err.message));
