// votes-scraper.js
// Scrapes Senate roll call votes (119th Congress sessions 1 & 2)
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
const byLis = new Map(senators.map(s => [String(s.id.lis || '').trim(), s]));

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

function normalizeName(str) {
  return (str || '').replace(/\s+/g, ' ').replace(/[,]+/g, '').trim().toLowerCase();
}

function findBioguideFromName(name) {
  const n = normalizeName(name);
  // Try "Last, First" and "First Last"
  for (const s of senators) {
    const last = normalizeName(s.name.last);
    const first = normalizeName(s.name.first);
    const full1 = `${last} ${first}`;
    const full2 = `${first} ${last}`;
    const official = normalizeName(s.name.official_full);
    if (n.includes(last) && (n.includes(first) || n.includes(official))) {
      return s.id.bioguide;
    }
    if (n.includes(full1) || n.includes(full2) || n.includes(official)) {
      return s.id.bioguide;
    }
  }
  return null;
}

async function fetchVoteMembers(congress, session, voteNumber) {
  const xml = await get(voteDetailUrl(congress, session, voteNumber));
  const data = parseXML(xml);

  const membersNode = data?.roll_call_vote?.members?.member || [];
  const arr = Array.isArray(membersNode) ? membersNode : [membersNode];

  return arr.map(m => {
    const lisId = String(m['lis_member_id'] || '').trim();
    const bioguideId = String(m['bioguide_id'] || '').trim();
    const vote = String(m['vote_cast'] || '').trim(); // Yea, Nay, Present, Not Voting
    const name = `${m['last_name'] || ''}, ${m['first_name'] || ''}`.trim();

    return { lisId, bioguideId, vote, name };
  });
}

async function run() {
  const totals = new Map(); // bioguideId -> { totalVotes, missedVotes }

  // Initialize totals for all current senators
  for (const s of senators) {
    totals.set(s.id.bioguide, { totalVotes: 0, missedVotes: 0 });
  }

  for (const idxUrl of INDEXES) {
    try {
      const xml = await get(idxUrl);
      const data = parseXML(xml);

      const congress = String(data?.vote_summary?.congress || '119').trim();
      const session = String(data?.vote_summary?.session || '1').trim();

      const votesNode = data?.vote_summary?.votes?.vote || [];
      const voteList = Array.isArray(votesNode) ? votesNode : [votesNode];

      for (const v of voteList) {
        const voteNumber = v['vote_number'];
        if (!voteNumber) continue;

        let members = [];
        try {
          members = await fetchVoteMembers(congress, session, voteNumber);
        } catch {
          // Skip this vote if detail fetch fails
          continue;
        }

        for (const m of members) {
          // Resolve to bioguideId: prefer bioguide, else map LIS, else name match
          let bioguideId = m.bioguideId && byBioguide.has(m.bioguideId) ? m.bioguideId : null;

          if (!bioguideId && m.lisId) {
            const sen = byLis.get(m.lisId);
            if (sen) bioguideId = sen.id.bioguide;
          }

          if (!bioguideId) {
            bioguideId = findBioguideFromName(m.name);
          }

          if (!bioguideId || !totals.has(bioguideId)) continue;

          const entry = totals.get(bioguideId);
          entry.totalVotes += 1;
          if (/not voting/i.test(m.vote)) {
            entry.missedVotes += 1;
          }
        }

        // small delay to avoid hammering
        await new Promise(r => setTimeout(r, 40));
      }
    } catch (err) {
      console.error(`Error processing index ${idxUrl}: ${err.message}`);
    }
  }

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
