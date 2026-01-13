const fs = require('fs');
const fetch = require('node-fetch');

const OUTPUT = 'public/senators-rankings.json';
const API_KEY = process.env.CONGRESS_API_KEY;

const stateMap = {
    'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California',
    'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'FL': 'Florida', 'GA': 'Georgia',
    'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
    'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
    'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi', 'MO': 'Missouri',
    'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey',
    'NM': 'New Mexico', 'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
    'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
    'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont',
    'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming'
};

async function main() {
    const base = JSON.parse(fs.readFileSync(OUTPUT, 'utf8'));
    console.log("Fetching Senate list from API...");
    
    const res = await fetch(`https://api.congress.gov/v3/member/senate?api_key=${API_KEY}&limit=250`);
    const apiData = await res.json();
    const apiMembers = apiData.members;

    let matchedCount = 0;

    for (let sen of base) {
        const fullStateName = stateMap[sen.state] || sen.state;
        const lastName = sen.name.split(' ').pop().toLowerCase();

        const match = apiMembers.find(m => 
            m.state === fullStateName && 
            m.name.toLowerCase().includes(lastName)
        );

        if (match) {
            const detailRes = await fetch(`https://api.congress.gov/v3/member/${match.bioguideId}?api_key=${API_KEY}`);
            const detail = await detailRes.json();
            
            sen.billsSponsored = detail.member.sponsoredLegislationCount || 0;
            sen.billsCosponsored = detail.member.cosponsoredLegislationCount || 0;
            sen.bioguideId = match.bioguideId;
            matchedCount++;
        }
    }

    fs.writeFileSync(OUTPUT, JSON.stringify(base, null, 2));
    console.log(`Success! Updated ${matchedCount} senators.`);
}

main().catch(console.error);
