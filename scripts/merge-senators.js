const fs = require('fs');
const path = require('path');

const RANKINGS_PATH = path.join(__dirname, '../public/senators-rankings.json');

async function main() {
  console.log('Merge script: consolidating into senators-rankings.json');

  let rankings;
  try {
    rankings = JSON.parse(fs.readFileSync(RANKINGS_PATH, 'utf8'));
  } catch (err) {
    console.error('Failed to load senators-rankings.json:', err.message);
    return;
  }

  // Remove duplicates by name (e.g. Peter Welch appearing twice)
  const seen = new Set();
  rankings = rankings.filter(sen => {
    if (seen.has(sen.name)) {
      console.log(`Removing duplicate entry for: ${sen.name}`);
      return false;
    }
    seen.add(sen.name);
    return true;
  });

  console.log(`After deduplication: ${rankings.length} senators`);

  // Preserve vote fields if they exist from votes-scraper
  rankings.forEach(sen => {
    sen.yeaVotes = Number(sen.yeaVotes) || 0;
    sen.nayVotes = Number(sen.nayVotes) || 0;
    sen.missedVotes = Number(sen.missedVotes) || 0;
    sen.totalVotes = Number(sen.totalVotes) || 0;
  });

  // Log some examples to verify votes are present
  const sampleSenators = ['Ted Cruz', 'Angela Alsobrooks', 'Tammy Baldwin', 'Ben Ray Luján', 'Peter Welch'];
  sampleSenators.forEach(name => {
    const sen = rankings.find(s => s.name === name);
    if (sen) {
      console.log(`After merge - ${name}: yea=${sen.yeaVotes}, nay=${sen.nayVotes}, missed=${sen.missedVotes}, total=${sen.totalVotes}, participation=${sen.participationPct || 'N/A'}`);
    } else {
      console.log(`After merge - ${name}: not found`);
    }
  });

  try {
    fs.writeFileSync(RANKINGS_PATH, JSON.stringify(rankings, null, 2));
    console.log('Merge complete: ' + rankings.length + ' senators total');
    console.log('- Legislation merged for ' + rankings.filter(s => s.sponsoredBills !== undefined).length + ' senators');
    console.log('- Votes merged for ' + rankings.filter(s => s.totalVotes > 0).length + ' senators (with any vote data)');
  } catch (err) {
    console.error('Write error:', err.message);
  }
}

main().catch(err => console.error('Merge failed:', err.message));
