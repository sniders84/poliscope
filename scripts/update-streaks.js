// scripts/update-streaks.js
// Purpose: Update streak field for Senators and Representatives once per week
// Increments streak if activity occurred, resets to 0 if inactive

const fs = require('fs');
const path = require('path');

function updateFile(filePath) {
  let data;
  try {
    data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (err) {
    console.error(`Failed to read ${filePath}:`, err.message);
    return;
  }

  const updated = data.map(person => {
    // Define "activity" as any new legislation, cosponsorship, vote, or committee change
    const activity =
      (person.sponsoredBills || 0) > 0 ||
      (person.cosponsoredBills || 0) > 0 ||
      (person.yeaVotes || 0) > 0 ||
      (person.nayVotes || 0) > 0 ||
      (person.committees && person.committees.length > 0);

    if (activity) {
      person.streak = (person.streak || 0) + 1;
    } else {
      person.streak = 0;
    }

    person.lastUpdated = new Date().toISOString();
    return person;
  });

  fs.writeFileSync(filePath, JSON.stringify(updated, null, 2));
  console.log(`Updated streaks in ${filePath} (${updated.length} records)`);
}

// Paths to rankings files
const senatorsPath = path.join(__dirname, '../public/senators-rankings.json');
const repsPath = path.join(__dirname, '../public/representatives-rankings.json');

updateFile(senatorsPath);
updateFile(repsPath);
