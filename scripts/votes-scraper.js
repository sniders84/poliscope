// votes-scraper.js
// Scrapes Senate roll call vote indexes (119th Congress, sessions 1 & 2)
// Tallies per-senator totals and missed votes
// Outputs public/senators-votes.json

const fs = require('fs');
const fetch = require('node-fetch');
const { XMLParser } = require('fast-xml-parser');

const INDEXES = [
  'https://www.senate.gov/legislative/LIS/roll_call_votes/vote119/vote_menu_119_1.xml',
  'https://www.senate.gov/legislative/LIS/roll_call_votes/vote119/vote_menu_119_2.xml',
];

const legislators = JSON.parse(fs.readFileSync('public/legislators-current.json', 'utf8'));
const senators = legislators.filter(l => l.terms.some(t => t.type === 'sen'));
const byBioguide = new Map(senators.map(s => [s.id.bioguide, s]));

async function get(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

function parseXML(xml) {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });
  return parser.parse(xml);
}

function voteDetailUrl(congress, session, voteNumber) {
  const padded = String(voteNumber).padStart(5, '0');
  return `https://www.senate.gov/legislative/LIS/roll_call_votes/vote${congress}${session}/vote_${congress}_${session}_${padded}.xml`;
}

async function fetchVoteMembers(congress, session, voteNumber) {
  const xml = await get(voteDetailUrl(congress, session, voteNumber));
  const data = parseXML(xml);

  const members = data.roll_call_vote?.members?.member || [];
  // Normalize to array
  const arr = Array.isArray(members) ? members : [members];

  return arr.map(m => ({
    bioguideId: m['lis_member_id'] || m['bioguide_id'] || null,
    vote: (m['vote_cast'] || '').trim(), // Yea, Nay, Present, Not Voting
    name: `${m['last_name'] || ''}, ${m['first_name'] || ''}`.trim(),
  }));
}

async function run() {
  const totals = new Map(); // bioguideId -> { totalVotes, missedVotes }

  // Initialize totals
  for (const s of senators) {
    totals.set(s.id.bioguide, { totalVotes: 0, missedVotes: 0 });
  }

  for (const idxUrl of INDEXES) {
    try {
      const xml = await get(idxUrl);
      const data = parseXML(xml);

      const congress = data.vote_summary?.congress || '119';
      const session = data.vote_summary?.session || '1';

      const votes = data.vote_summary?.votes?.vote || [];
      const voteList = Array.isArray(votes) ? votes : [votes];

      for (const v of voteList) {
        const voteNumber = v['vote_number'];
        if (!voteNumber) continue;

        let members = [];
        try {
          members = await fetchVoteMembers(congress, session, voteNumber);
        } catch {
          // If detail fetch fails, skip this vote
          continue;
        }

        for (const m of members) {
          // Prefer bioguide; if only LIS is present, try to map via name
          let bioguideId = m.bioguideId;
          if (!bioguideId) {
            // Attempt name-based match
            const match = senators.find(s => {
              const last = s.name.last.toLowerCase();
              return m.name.toLowerCase().includes(last);
            });
            bioguideId = match?.id?.bioguide || null;
          }
          if (!bioguideId || !totals.has(bioguideId)) continue;

          const entry = totals.get(bioguideId);
          entry.totalVotes += 1;
          if (/not voting/i.test(m.vote)) {
            entry.missedVotes += 1;
          }
        }

        // small delay to avoid hammering
        await new Promise(r => setTimeout(r, 50));
      }
    } catch (err) {
      console.error(`Error processing index ${idxUrl}: ${err.message}`);
    }
  }

  // Build output
  const results = [];
  for (const [bioguideId, t] of totals.entries()) {
    results.push({
      bioguideId,
      totalVotes: t.totalVotes,
      missedVotes: t.missedVotes,
    });
  }

  fs.writeFileSync('public/senators-votes.json', JSON.stringify(results, null, 2));
  console.log('Votes scraper complete!');
}

run().catch(err => console.error(err));
