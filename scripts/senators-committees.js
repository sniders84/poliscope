const fs = require('fs');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

const INDEX_URL = 'https://www.senate.gov/committees/index.htm';

async function getCommitteeUrls() {
  const res = await fetch(INDEX_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
  });
  if (!res.ok) throw new Error(`Index fetch failed: ${res.status}`);

  const html = await res.text();
  const $ = cheerio.load(html);

  const committees = [];

  // The table has rows with committee name and link
  $('table tr').each((i, row) => {
    const nameCell = $(row).find('td:first-child');
    const linkCell = $(row).find('td a:contains("Committee Member List")');

    const committeeName = nameCell.text().trim();
    const linkHref = linkCell.attr('href');

    if (committeeName && linkHref && linkHref.includes('committee_memberships_')) {
      const fullUrl = new URL(linkHref, 'https://www.senate.gov').href;
      committees.push({ name: committeeName, url: fullUrl });
    }
  });

  console.log(`Found ${committees.length} committee membership URLs`);
  return committees;
}

async function parseCommitteeMembers(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
  });
  if (!res.ok) {
    console.log(`Skipped ${url.split('/').pop()}: ${res.status}`);
    return { members: [], chairman: null, ranking: null, subcommittees: [] };
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  const members = [];
  let chairman = null;
  let ranking = null;
  const subcommittees = [];

  // Main members are in lists or tables
  $('li, p strong, td').each((i, el) => {
    const text = $(el).text().trim();
    if (text.includes('Chairman')) chairman = text.replace('Chairman', '').trim();
    if (text.includes('Ranking Member')) ranking = text.replace('Ranking Member', '').trim();
    if (text && text.includes('(') && text.includes(')')) {
      const cleaned = text.replace(/\s*\(.*?\)\s*/g, '').trim();
      if (cleaned && !members.includes(cleaned)) members.push(cleaned);
    }
  });

  // Subcommittees - look for headings and lists
  $('h3, strong:contains("Subcommittee")').each((i, subHead) => {
    const subName = $(subHead).text().trim().replace('Subcommittee on', '').trim();
    const subMembers = [];
    let subChair = null;
    let subRanking = null;

    // Find following list or text
    $(subHead).nextAll('ul, ol, p').first().find('li, a').each((j, li) => {
      const liText = $(li).text().trim();
      if (liText.includes('Chairman')) subChair = liText.replace('Chairman', '').trim();
      if (liText.includes('Ranking')) subRanking = liText.replace('Ranking Member', '').trim();
      if (liText.includes('(')) subMembers.push(liText.replace(/\s*\(.*?\)\s*/g, '').trim());
    });

    if (subName) {
      subcommittees.push({
        subcommittee: subName,
        chair: subChair,
        ranking: subRanking,
        members: subMembers
      });
    }
  });

  return { members, chairman, ranking, subcommittees };
}

async function main() {
  try {
    const committees = await getCommitteeUrls();

    const senatorMap = {}; // name -> {committees: []}

    for (const comm of committees) {
      console.log(`Parsing ${comm.name} from ${comm.url.split('/').pop()}`);
      const data = await parseCommitteeMembers(comm.url);

      // Add main committee to each member
      data.members.forEach(member => {
        if (!senatorMap[member]) senatorMap[member] = { name: member, committees: [] };
        const role = member === data.chairman ? 'Chairman' : (member === data.ranking ? 'Ranking Member' : 'Member');
        senatorMap[member].committees.push({
          committee: comm.name,
          role
        });
      });

      // Subcommittees - add to members if listed
      data.subcommittees.forEach(sub => {
        sub.members.forEach(member => {
          if (senatorMap[member]) {
            const mainComm = senatorMap[member].committees.find(c => c.committee === comm.name);
            if (mainComm) {
              if (!mainComm.subcommittees) mainComm.subcommittees = [];
              const subRole = member === sub.chair ? 'Chairman' : (member === sub.ranking ? 'Ranking Member' : 'Member');
              mainComm.subcommittees.push({
                subcommittee: sub.subcommittee,
                role: subRole
              });
            }
          }
        });
      });
    }

    const result = Object.values(senatorMap);
    console.log(`Parsed assignments for ${result.length} senators`);

    fs.writeFileSync('public/senators-committees.json', JSON.stringify(result, null, 2));
    console.log('senators-committees.json updated!');
  } catch (err) {
    console.error('Error:', err.message);
  }
}

main();
