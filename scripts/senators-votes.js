// scripts/senators-votes.js
const fs = require('fs');
const fetch = require('node-fetch');
const { Parser } = require('xml2js');

const OUTPUT = 'public/senators-rankings.json';
const parser = new Parser();

async function main() {
    // 119th Congress, 1st Session (2025)
    // Senate.gov official XML list of all roll call votes
    const URL = 'https://www.senate.gov/legislative/LIS/roll_call_lists/vote_menu_119_1.xml';
    
    console.log(`Fetching total vote count from ${URL}...`);
    const res = await fetch(URL);
    const xml = await res.text();
    const data = await parser.parseStringPromise(xml);

    // Each <vote> tag is a roll call vote
    const totalVotesInSession = data.vote_menu.vote.length;
    console.log(`Total roll call votes found: ${totalVotesInSession}`);

    const base = JSON.parse(fs.readFileSync(OUTPUT, 'utf8'));

    // Update the "Total Votes" for everyone
    base.forEach(sen => {
        sen.totalVotes = totalVotesInSession;
        // Note: senate.gov does not provide a summary "Missed" count XML.
        // Usually, this is left at 0 or updated via manual entry if using official-only sources.
        if (!sen.missedVotes) sen.missedVotes = 0; 
    });

    fs.writeFileSync(OUTPUT, JSON.stringify(base, null, 2));
    console.log(`Updated all senators with total session vote count.`);
}

main().catch(console.error);
