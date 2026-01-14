/**
 * Votes scraper (Senate-only, Congress.gov API)
 * - Fetches roll call votes
 * - Aggregates total votes, missed votes per senator
 * - Outputs public/senators-votes.json
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY=process.env.CONGRESS_GOV_API_KEY;
const CONGRESS=process.env.CONGRESS_NUMBER||'119';
const OUT_PATH=path.join('public','senators-votes.json');

if(!API_KEY)throw new Error('Missing CONGRESS_GOV_API_KEY env.');

function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
function getJson(url){return new Promise((resolve,reject)=>{
  https.get(url,res=>{
    let data='';res.on('data',c=>data+=c);
    res.on('end',()=>{try{resolve(JSON.parse(data));}catch(e){reject(e);}});
  }).on('error',reject);
});}
async function fetchAllPages(baseUrl){
  const results=[];let page=1;
  while(true){
    const url=`${baseUrl}&page=${page}`;
    const json=await getJson(url);
    const items=json?.data||[];
    results.push(...items);
    if(page>=(json?.pagination?.pages||1))break;
    page++;await sleep(200);
  }
  return results;
}
function bioguide(m){return m?.bioguideId||null;}
function initTotals(){return{totalVotes:0,missedVotes:0,missedVotePct:0};}

async function run(){
  console.log(`Votes scraper: Congress=${CONGRESS}, chamber=Senate`);
    const rollcalls = await fetchAllPages(
    `https://api.congress.gov/v3/rollcallvote?format=json&congress=${CONGRESS}&chamber=Senate&api_key=${API_KEY}`
  );
  console.log(`Fetched Senate roll call votes: ${rollcalls.length}`);

  const totals = new Map();
  const ensure = (id) => {
    if (!totals.has(id)) totals.set(id, initTotals());
    return totals.get(id);
  };

  // Loop through each roll call vote
  for (const rc of rollcalls) {
    const members = rc?.members || [];
    for (const m of members) {
      const id = bioguide(m);
      if (!id) continue;
      const t = ensure(id);
      t.totalVotes++;
      if (m?.votePosition === 'Not Voting') {
        t.missedVotes++;
      }
    }
  }

  // Calculate percentages
  for (const [id, t] of totals.entries()) {
    t.missedVotePct =
      t.totalVotes > 0 ? +(100 * t.missedVotes / t.totalVotes).toFixed(2) : 0;
  }

  const results = Array.from(totals.entries()).map(([bioguideId, t]) => ({
    bioguideId,
    ...t,
  }));

  const publicDir = path.join('public');
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

  fs.writeFileSync(OUT_PATH, JSON.stringify(results, null, 2));
  console.log(`Wrote ${OUT_PATH} with ${results.length} senator entries.`);
}

run().catch((err) => {
  console.error('Votes scraper failed:', err);
  process.exit(1);
});
