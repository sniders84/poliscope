const fs = require('fs');
const fetch = require('node-fetch');

const baseData = JSON.parse(fs.readFileSync('public/senators-rankings.json', 'utf8'));
const jsonPath = 'public/senators-legislation.json';

const apiKey = process.env.CONGRESS_API_KEY;
const headers = apiKey ? { 'X-Api-Key': apiKey } : {};

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

async function updateLegislation(sen) {
  const base = `https://api.congress.gov/v3/member/${sen.bioguideId}`;

  let sponsoredBills = 0;
  let sponsoredAmendments = 0;
  let cosponsoredBills = 0;
  let cosponsoredAmendments = 0;
  let becameLawBills = 0;
  let becameLawAmendments = 0;

  const sponsoredItems = await fetchAllLegislation(`${base}/sponsored-legislation`, 'sponsoredLegislation');
  sponsoredItems.forEach(item => {
    if (item.congress === 119) {
      const number = (item.number || '').toLowerCase();
      const actionText = (item.latestAction?.text || '').toLowerCase();
      const enacted = /became law|enacted|signed by president|public law/i.test(actionText);
      if (number.startsWith('s.amdt.') || item.amendmentNumber) {
        sponsoredAmendments++;
        if (enacted || actionText.includes('agreed to')) becameLawAmendments++;
      } else {
        sponsoredBills++;
        if (enacted) becameLawBills++;
      }
    }
  });

  const cosponsoredItems = await fetchAllLegislation(`${base}/cosponsored-legislation`, 'cosponsoredLegislation');
  cosponsoredItems.forEach(item => {
    if (item.congress === 119) {
      const number = (item.number || '').toLowerCase();
      if (number.startsWith('s.amdt.') || item.amendmentNumber) {
        cosponsoredAmendments++;
      } else {
        cosponsoredBills++;
      }
    }
  });

  return {
    name: sen.name,
    bioguideId: sen.bioguideId,
    sponsoredBills,
    sponsoredAmendments,
    cosponsoredBills,
    cosponsoredAmendments,
    becameLawBills,
    becameLawAmendments
  };
}

(async () => {
  const output = [];
  for (const sen of baseData) {
    try {
      const record = await updateLegislation(sen);
      output.push(record);
      console.log(`Updated ${sen.name}: sBills ${record.sponsoredBills} sAmend ${record.sponsoredAmendments} cBills ${record.cosponsoredBills} cAmend ${record.cosponsoredAmendments} becameLawB ${record.becameLawBills}`);
    } catch (err) {
      console.log(`Error for ${sen.name}: ${err.message}`);
    }
  }

  fs.writeFileSync(jsonPath, JSON.stringify(output, null, 2) + '\n');
  console.log('senators-legislation.json fully updated!');
})();
