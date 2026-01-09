const fs = require('fs');
const fetch = require('node-fetch');

const jsonPath = 'public/senators-rankings.json';
const senators = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

const apiKey = process.env.CONGRESS_API_KEY;
const headers = apiKey ? { 'X-Api-Key': apiKey } : {};

let missedLookup = { missed: {}, totalVotes: 0 };

// Scrape Senate.gov committee assignments and leadership roles
async function fetchSenateCommitteesForSenator(senatorName) {
  const url = 'https://www.senate.gov/general/committee_assignments/committee_assignments.htm';
  const res = await fetch(url);
  if (!res.ok) return [];

  const html = await res.text();
  const nameEsc = senatorName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const senatorBlockRegex = new RegExp(`${nameEsc}[\\s\\S]*?(?=<strong>|<b>|<h3>|<h2>|<hr|</div>)`, 'i');
  const blockMatch = html.match(senatorBlockRegex);
  if (!blockMatch) return [];

  const block = blockMatch[0];
  const lines = block.split('\n').filter(l => /Committee on|Special Committee|Select Committee/i.test(l));
  const committees = [];

  lines.forEach(line => {
    const clean = line.replace(/<[^>]+>/g, '').trim();
    if (!clean) return;

    let role = 'Member';
    if (/\(Chairman\)/i.test(clean) || /\(Chair\)/i.test(clean)) role = 'Chairman';
    else if (/\(Ranking\)/i.test(clean) || /\(Ranking Member\)/i.test(clean)) role = 'Ranking';

    const name = clean.replace(/\s*\((Chairman|Chair|Ranking|Ranking Member)\)\s*$/i, '').trim();
    if (/Subcommittee/i.test(name)) return; // skip subcommittees if you only want top-level

    committees.push({ name, role });
  });

  const byName = new Map();
  committees.forEach(c => {
    const prev = byName.get(c.name);
    if (!prev || (prev.role === 'Member' && c.role !== 'Member')) {
      byName.set(c.name, c);
    }
  });

  return Array.from(byName.values());
}

// Precompute missed votes across entire 119th Congress
async function buildMissedVotesLookup(allSenatorNames) {
  const indexUrls = [
    'https://www.senate.gov/legislative/LIS/roll_call_lists/vote_menu_119_1.xml',
    'https://www.senate.gov/legislative/LIS/roll_call_lists/vote_menu_119_2.xml'
  ];

  let voteUrls = [];
  for (const idxUrl of indexUrls) {
    const idxRes = await fetch(idxUrl);
    if (!idxRes.ok) continue;
    const xmlText = await idxRes.text();
    const matches = [...xmlText.matchAll(/<vote_number>(\d+)<\/vote_number>/g)];
    const session = idxUrl.includes('_1.xml') ? '1' : '2';
    matches.forEach(m => {
      const num = m[1].padStart(5, '0');
      voteUrls.push(`https://www.senate.gov/legislative/LIS/roll_call_votes/vote119${session}/vote_119_${session}_${num}.htm`);
    });
  }

  const chunkSize = 20;
  const missed = Object.fromEntries(allSenatorNames.map(n => [n, 0]));

  for (let i = 0; i < voteUrls.length; i += chunkSize) {
    const chunk = voteUrls.slice(i, i + chunkSize);
    const results = await Promise.all(chunk.map(url => fetch(url).then(r => r.ok ? r.text() : '')));
    results.forEach(html => {
      if (!html) return;
      allSenatorNames.forEach(name => {
        if (html.includes(name) && html.includes('Not Voting')) {
          missed[name] = (missed[name] || 0) + 1;
        }
      });
    });
  }

  return { missed, totalVotes: voteUrls.length };
}

// Helper to fetch all pages of legislation
async function fetchAllLegislation(urlBase, key) {
  const pageSize = 500;
  let offset = 0;
  let all = [];
  while (true) {
    const url = `${urlBase}?limit=${pageSize}&offset=${offset}`;
    const res = await fetch(url, { headers });
    if (!res.ok) break;
    const data = await res.json();
    const items = data[key] || [];
    all = all.concat(items);
    if (items.length < pageSize) break;
    offset += pageSize;
  }
  return all;
}

// Calculate Power Score
function calculateScore(sen) {
  let score = 0;

  // Sponsored bills/amendments
  score += sen.sponsoredBills * 1.0;
  score += sen.sponsoredAmendments * 0.5;

  // Cosponsored bills/amendments
  score += sen.cosponsoredBills * 0.5;
  score += sen.cosponsoredAmendments * 0.25;

  // Became law (extra credit)
  score += sen.becameLawBills * 2.0;
  score += sen.becameLawAmendments * 1.0;

  // Committees with leadership bonuses
  if (Array.isArray(sen.committees)) {
    sen.committees.forEach(c => {
      score += 2; // baseline for membership
      if (c.role === 'Ranking') score += 2;
      if (c.role === 'Chairman') score += 4;
    });
  }

  // Missed votes penalty
  score -= sen.votes * 0.5;

  sen.powerScore = score;
}

async function updateSenator(sen) {
  try {
    const base = `https://api.congress.gov/v3/member/${sen.bioguideId}`;

    sen.sponsoredBills = 0;
    sen.sponsoredAmendments = 0;
    sen.cosponsoredBills = 0;
    sen.cosponsoredAmendments = 0;
    sen.becameLawBills = 0;
    sen.becameLawAmendments = 0;

    // Sponsored
    const sponsoredItems = await fetchAllLegislation(`${base}/sponsored-legislation`, 'sponsoredLegislation');
    sponsoredItems.forEach(item => {
      if (item.congress === 119) {
        const number = (item.number || '').toLowerCase();
        const actionText = (item.latestAction?.text || '').toLowerCase();
        const enacted = /became law|enacted|signed by president|public law/i.test(actionText);
        if (number.startsWith('s.amdt.') || item.amendmentNumber) {
          sen.sponsoredAmendments++;
          if (enacted || actionText.includes('agreed to')) sen.becameLawAmendments++;
        } else {
          sen.sponsoredBills++;
          if (enacted) sen.becameLawBills++;
        }
      }
    });

    // Cosponsored
    const cosponsoredItems = await fetchAllLegislation(`${base}/cosponsored-legislation`, 'cosponsoredLegislation');
    cosponsoredItems.forEach(item => {
      if (item.congress === 119) {
        const number = (item.number || '').toLowerCase();
        if (number.startsWith('s.amdt.') || item.amendmentNumber) {
          sen.cosponsoredAmendments++;
        } else {
          sen.cosponsoredBills++;
        }
      }
    });

    // Committees and leadership roles from Senate.gov
    try {
      const senateCommittees = await fetchSenateCommitteesForSenator(sen.name);
      sen.committees = senateCommittees.length ? senateCommittees : [];
    } catch {
      sen.committees = [];
    }

    // Missed votes from precomputed lookup
    sen.votes = missedLookup.missed[sen.name] || 0;
    sen.missedPct = (missedLookup.totalVotes > 0) ? (sen.votes / missedLookup.totalVotes) * 100 : 0;

    // Calculate Power Score
    calculateScore(sen);

    console.log(`Updated ${sen.name}: powerScore ${sen.powerScore} sBills ${sen.sponsoredBills} sAmend ${sen.sponsoredAmendments} cBills ${sen.cosponsoredBills} cAmend ${sen.cosponsoredAmendments} becameLawB ${sen.becameLawBills} committees ${sen.committees.length} missed ${sen.votes}`);
  } catch (err) {
    console.log(`Error for ${sen.name}: ${err.message}`);
  }
}

(async () => {
  const allNames = senators.map(s => s.name);
  missedLookup = await buildMissedVotesLookup(allNames);

  for (const sen of senators) {
    await updateSenator(sen);
  }

  fs.writeFileSync(jsonPath, JSON.stringify(senators, null, 2) + '\n');
  console.log('Schema fully updated!');
})();
