// scripts/senators-legislation.js
const fs = require('fs');
const fetch = require('node-fetch');

const OUTPUT = 'public/senators-rankings.json';
const API_KEY = process.env.CONGRESS_API_KEY;

if (!API_KEY) {
    console.error("Error: CONGRESS_API_KEY is not set in environment variables.");
    process.exit(1);
}

const base = JSON.parse(fs.readFileSync(OUTPUT, 'utf8'));

async function fetchAPI(endpoint) {
    const url = `https://api.congress.gov/v3${endpoint}${endpoint.includes('?') ? '&' : '?'}api_key=${API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`API Error ${res.status}: ${url}`);
    return await res.json();
}

async function main() {
    console.log("Fetching Senate member list from Congress.gov API...");
    
    // 1. Get all current Senators to get their Bioguide IDs
    // We filter for 119th Congress (2025-2027)
    const memberData = await fetchAPI('/member?chamber=senate&limit=250');
    const apiMembers = memberData.members;

    let matchedCount = 0;

    // 2. Map local JSON senators to API data
    for (let sen of base) {
        // Match by state and last name (most reliable match across official datasets)
        const match = apiMembers.find(m => 
            m.state === sen.state && 
            sen.name.toLowerCase().includes(m.name.toLowerCase().split(',')[0])
        );

        if (match && match.bioguideId) {
            try {
                // 3. Fetch detailed counts for this specific senator
                console.log(`Updating ${sen.name} (${match.bioguideId})...`);
                const details = await fetchAPI(`/member/${match.bioguideId}`);
                
                sen.billsSponsored = details.member.sponsoredLegislationCount || 0;
                sen.billsCosponsored = details.member.cosponsoredLegislationCount || 0;
                sen.bioguideId = match.bioguideId; // Save this for future API calls
                
                matchedCount++;
                // Small delay to respect rate limits (5000/hr is generous, but stay safe)
                await new Promise(r => setTimeout(r, 100)); 
            } catch (e) {
                console.warn(`Failed to fetch details for ${sen.name}: ${e.message}`);
            }
        }
    }

    fs.writeFileSync(OUTPUT, JSON.stringify(base, null, 2));
    console.log(`---`);
    console.log(`Success! Updated ${matchedCount} senators with official legislation counts.`);
}

main().catch(err => {
    console.error('Fatal:', err);
    process.exit(1);
});
