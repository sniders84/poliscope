const fs = require('fs');
const fetch = require('node-fetch');

const baseData = JSON.parse(fs.readFileSync('public/senators-base.json', 'utf8'));
const jsonPath = 'public/senators-committees.json';

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

  // Deduplicate by committee name, preferring leadership roles
  const byName = new Map();
  committees.forEach(c => {
    const prev = byName.get(c.name);
    if (!prev || (prev.role === 'Member' && c.role !== 'Member')) {
      byName.set(c.name, c);
    }
  });

  return Array.from(byName.values());
}

async function updateCommittees(sen) {
  try {
    const committees = await fetchSenateCommitteesForSenator(sen.name);
    return {
      name: sen.name,
      bioguideId: sen.bioguideId,
      committees
    };
  } catch (err) {
    console.log(`Error fetching committees for ${sen.name}: ${err.message}`);
    return {
      name: sen.name,
      bioguideId: sen.bioguideId,
      committees: []
    };
  }
}

(async () => {
  const output = [];
  for (const sen of baseData) {
    const record = await updateCommittees(sen);
    output.push(record);
    console.log(`Updated ${sen.name}: committees ${record.committees.length}`);
  }

  fs.writeFileSync(jsonPath, JSON.stringify(output, null, 2) + '\n');
  console.log('senators-committees.json fully updated!');
})();
