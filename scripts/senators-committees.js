const fs = require('fs');
const fetch = require('node-fetch');

const OUTPUT = 'public/senators-rankings.json';
const API_KEY = process.env.CONGRESS_API_KEY;

async function main() {
    const base = JSON.parse(fs.readFileSync(OUTPUT, 'utf8'));
    
    for (let sen of base) {
        if (!sen.bioguideId) continue; // Skip if legislation script hasn't run yet

        console.log(`Fetching committees for ${sen.name}...`);
        const res = await fetch(`https://api.congress.gov/v3/member/${sen.bioguideId}/committees?api_key=${API_KEY}`);
        const data = await res.json();
        
        if (data.committees) {
            sen.committees = data.committees.map(c => c.name);
            sen.committeeCount = sen.committees.length;
        }
    }

    fs.writeFileSync(OUTPUT, JSON.stringify(base, null, 2));
    console.log("Committees updated via Official API.");
}

main().catch(console.error);
