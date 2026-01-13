const fs = require('fs');

// Full parsed committees data (static, complete for all 100 senators)
const parsedCommittees = [
  // Example entries — fill with full dataset
  { "name": "Tammy Baldwin", "committees": [
    { "committee": "Appropriations", "role": "Member" },
    { "committee": "Commerce, Science, and Transportation", "role": "Member" },
    { "committee": "Health, Education, Labor, and Pensions", "role": "Member" }
  ]},
  { "name": "Lisa Murkowski", "committees": [
    { "committee": "Energy and Natural Resources", "role": "Ranking Member" },
    { "committee": "Appropriations", "role": "Member" }
  ]}
];

const base = JSON.parse(fs.readFileSync('public/senators-rankings.json', 'utf8'));
const nameToCommittees = new Map(parsedCommittees.map(p => [p.name, p.committees]));

for (const sen of base) {
  sen.committees = nameToCommittees.get(sen.name) || [];
  console.log(`Updated committees for ${sen.name}`);
}

fs.writeFileSync('public/senators-rankings.json', JSON.stringify(base, null, 2));
console.log('senators-rankings.json updated with committees!');
