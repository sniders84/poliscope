const fs = require('fs');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

const baseData = JSON.parse(fs.readFileSync('public/senators-rankings.json', 'utf8'));
const jsonPath = 'public/senators-committees.json';

async function fetchCommitteeAssignments() {
  const url = 'https://www.senate.gov/general/committee_assignments/assignments.htm';
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}`);
  const html = await res.text();
  return cheerio.load(html);
}

(async () => {
  const $ = await fetchCommitteeAssignments();

  // Build senator → committees map
  const senatorCommittees = {};
  $('div.committee').each((_, div) => {
    const committeeName = $(div).find('h3').text().trim();
    const members = $(div).find('li');

    members.each((_, li) => {
      const text = $(li).text().trim();
      if (!text) return;

      let role = 'Member';
      if (/Chair/i.test(text)) role = 'Chairman';
      else if (/Ranking/i.test(text)) role = 'Ranking';

      const name = text.replace(/\(.*?\)/, '').trim();

      if (!senatorCommittees[name]) senatorCommittees[name] = [];
      senatorCommittees[name].push({ name: committeeName, role });
    });
  });

  const output = baseData.map(sen => {
    const committees = senatorCommittees[sen.name] || [];
    return {
      name: sen.name,
      bioguideId: sen.bioguideId,
      committees
    };
  });

  fs.writeFileSync(jsonPath, JSON.stringify(output, null, 2) + '\n');
  console.log('senators-committees.json fully updated!');
})();
