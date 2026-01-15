const fs = require('fs');
const path = require('path');

const RANKINGS_PATH = path.join(__dirname, '../public/representatives-rankings.json');

async function main() {
  console.log('Merge script: consolidating into representatives-rankings.json');

  let rankings;
  try {
    rankings = JSON.parse(fs.readFileSync(RANKINGS_PATH, 'utf8'));
  } catch (err) {
    console.error('Failed to load representatives-rankings.json:', err.message);
    return;
  }

  // Remove duplicates by name
  const seen = new Set();
  rankings = rankings.filter(rep => {
    if (seen.has(rep.name)) {
      console.log(`Removing duplicate entry for: ${rep.name}`);
      return false;
    }
    seen.add(rep.name);
    return true;
  });

  console.log(`After deduplication: ${rankings.length} representatives`);

  // Preserve vote fields if they exist from votes-scraper
  rankings.forEach(rep => {
    rep.yeaVotes = Number(rep.yeaVotes) || 0;
    rep.nayVotes = Number(rep.nayVotes) || 0;
    rep.missedVotes = Number(rep.missedVotes) || 0;
    rep.totalVotes = Number(rep.totalVotes) || 0;
  });

  // Log some examples to verify votes are present
  const sampleReps = ['Hakeem Jeffries', 'Kevin McCarthy', 'Nancy Pelosi', 'Jim Jordan', 'Steny Hoyer'];
  sampleReps.forEach(name => {
    const rep = rankings.find(r => r.name === name);
    if (rep) {
      console.log(
        `After merge - ${name}: yea=${rep.yeaVotes}, nay=${rep.nayVotes}, missed=${rep.missedVotes}, total=${rep.totalVotes}, participation=${rep.participationPct || 'N/A'}`
      );
    } else {
      console.log(`After merge - ${name}: not found`);
    }
  });

  try {
    fs.writeFileSync(RANKINGS_PATH, JSON.stringify(rankings, null, 2));
    console.log('Merge complete: ' + rankings.length + ' representatives total');
    console.log('- Legislation merged for ' + rankings.filter(r => r.sponsoredBills !== undefined).length + ' representatives');
    console.log('- Votes merged for ' + rankings.filter(r => r.totalVotes > 0).length + ' representatives (with any vote data)');
  } catch (err) {
    console.error('Write error:', err.message);
  }
}

main().catch(err => console.error('Merge failed:', err.message));
