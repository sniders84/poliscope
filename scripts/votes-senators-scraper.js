const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const xml2js = require('xml2js').parseStringPromise;

const RANKINGS_PATH = path.join(__dirname, '../public/senators-rankings.json');

const SESSION_RANGES = {
  1: { start: 1, end: 659 },
  2: { start: 1, end: 9 }
};

// Updated LIS ID to name map based on current 119th Congress data
const LIS_TO_NAME_MAP = {
  'S153': 'Chuck Grassley',
  'S174': 'Mitch McConnell',
  'S229': 'Patty Murray',
  'S247': 'Ron Wyden',
  'S252': 'Susan Collins',
  'S253': 'Dick Durbin',
  'S259': 'Jack Reed',
  'S266': 'Mike Crapo',
  'S270': 'Chuck Schumer',
  'S287': 'John Cornyn',
  'S288': 'Lisa Murkowski',
  'S293': 'Lindsey Graham',
  'S311': 'Amy Klobuchar',
  'S313': 'Bernie Sanders',
  'S316': 'Sheldon Whitehouse',
  'S317': 'John Barrasso',
  'S318': 'Roger Wicker',
  'S322': 'Jeff Merkley',
  'S323': 'Jim Risch',
  'S324': 'Jeanne Shaheen',
  'S327': 'Mark Warner',
  'S331': 'Kirsten Gillibrand',
  'S337': 'Chris Coons',
  'S341': 'Richard Blumenthal',
  'S343': 'John Boozman',
  'S344': 'John Hoeven',
  'S345': 'Ron Johnson',
  'S346': 'Mike Lee',
  'S347': 'Jerry Moran',
  'S353': 'Brian Schatz',
  'S355': 'Ted Cruz',
  'S357': 'Deb Fischer',
  'S359': 'Martin Heinrich',
  'S361': 'Mazie Hirono',
  'S362': 'Tim Kaine',
  'S363': 'Angus King',
  'S364': 'Chris Murphy',
  'S365': 'Tim Scott',
  'S366': 'Elizabeth Warren',
  'S369': 'Ed Markey',
  'S370': 'Cory Booker',
  'S372': 'Shelley Moore Capito',
  'S373': 'Bill Cassidy',
  'S374': 'Tom Cotton',
  'S375': 'Steve Daines',
  'S376': 'Joni Ernst',
  'S378': 'James Lankford',
  'S381': 'Mike Rounds',
  'S383': 'Dan Sullivan',
  'S384': 'Thom Tillis',
  'S385': 'Catherine Cortez Masto',
  'S386': 'Tammy Duckworth',
  'S388': 'Maggie Hassan',
  'S389': 'John Kennedy',
  'S390': 'Chris Van Hollen',
  'S391': 'Todd Young',
  'S394': 'Tina Smith',
  'S395': 'Cindy Hyde-Smith',
  'S396': 'Marsha Blackburn',
  'S398': 'Kevin Cramer',
  'S402': 'Jacky Rosen',
  'S404': 'Rick Scott',
  'S406': 'Mark Kelly',
  'S407': 'Bill Hagerty',
  'S408': 'John Hickenlooper',
  'S409': 'Ben Ray Luján',
  'S410': 'Cynthia Lummis',
  'S411': 'Roger Marshall',
  'S412': 'Tommy Tuberville',
  'S413': 'Alex Padilla',
  'S414': 'Jon Ossoff',
  'S415': 'Raphael Warnock',
  'S416': 'Katie Britt',
  'S417': 'Ted Budd',
  'S418': 'John Fetterman',
  'S419': 'Markwayne Mullin',
  'S420': 'Eric Schmitt',
  'S422': 'Peter Welch',
  'S423': 'Pete Ricketts',
  'S426': 'Andy Kim',
  'S427': 'Adam Schiff',
  'S428': 'Angela Alsobrooks',
  'S429': 'Jim Banks',
  'S430': 'Lisa Blunt Rochester',
  'S431': 'John Curtis',
  'S433': 'Dave McCormick',
  'S435': 'Tim Sheehy',
  'S437': 'Jim Justice',
  'S438': 'Jon Husted',
  'S439': 'Ashley Moody'
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
  const seenInVote = new Set(); // Prevent double-counting the same senator in one vote

  members.forEach(m => {
    const voteCast = m.vote_cast?.trim() || 'Unknown';
    const lisId = m.lis_member_id?.trim();
    let name = null;

    // Priority: match by LIS ID
    if (lisId && LIS_TO_NAME_MAP[lisId]) {
      name = LIS_TO_NAME_MAP[lisId];
    } else {
      // Fallback: name-based match
      let xmlFull = (m.member_full || '').trim().toLowerCase();
      xmlFull = xmlFull.replace(/\s*\([d,r,i]-\w{2}\)\s*/i, '').trim();

      for (const senInfo of senatorMap.values()) {
        const senNameLower = senInfo.name.toLowerCase();
        const senState = senInfo.state?.toUpperCase() || '';
        const senParty = senInfo.party?.toUpperCase() || '';
        const senLastParts = senNameLower.split(' ').slice(-2);

        const lastMatch = senLastParts.some(part => xmlFull.includes(part));

        if (lastMatch &&
            (!senState || senState === (m.state || '').toUpperCase()) &&
            (!senParty || senParty === (m.party || '').toUpperCase())) {
          name = senInfo.name;
          break;
        }
      }
    }

    // Only count if we have a valid name and haven't seen this senator yet in this vote
    if (name && !seenInVote.has(name)) {
      seenInVote.add(name);
      if (voteCast === 'Yea') yea.push(name);
      if (voteCast === 'Nay') nay.push(name);
      if (voteCast === 'Not Voting') notVoting.push(name);
    } else if (voteCast !== 'Unknown') {
      unmatched.push(`${m.member_full || 'unknown'} (${lisId || 'no_lis'}, ${m.state || '?'}-${m.party || '?'}, ${voteCast})`);
    }
  });

  console.log(`Vote ${voteId}: ${yea.length} Yea, ${nay.length} Nay, ${notVoting.length} Not Voting`);

  if (unmatched.length > 0) {
    console.log(`Unmatched in ${voteId}: ${unmatched.slice(0, 5).join(', ')}...`);
  }

  return { yea, nay, notVoting };
}

async function main() {
  console.log('Votes scraper: prioritize lis_member_id match + fallback + deduplication per vote');

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
          return parseVoteCounts(parsed, senatorMap, voteId).then(counts => {
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
