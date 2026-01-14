/**
 * Committee scraper
 * - Reads public/senators-committee-membership-current.json
 * - Aggregates committee memberships per senator
 * - Captures leadership flags (Chair, Ranking Member)
 * - Outputs public/senators-committees.json
 */

const fs = require('fs');
const path = require('path');

const INPUT = path.join('public','senators-committee-membership-current.json');
const OUTPUT = path.join('public','senators-committees.json');

function run(){
  if(!fs.existsSync(INPUT))throw new Error(`Missing ${INPUT}`);
  const committees = JSON.parse(fs.readFileSync(INPUT,'utf8'));
  const totals=new Map();

  for(const [cid,committee] of Object.entries(committees)){
    const name=committee?.name||cid;
    for(const m of committee?.members||[]){
      const id=m?.bioguideId; if(!id)continue;
      if(!totals.has(id))totals.set(id,[]);
      totals.get(id).push({
        committee:name,
        role:m?.rank==='Chairman'?'Chair':m?.rank==='Ranking Member'?'Ranking Member':'Member'
      });
    }
  }

  const results=Array.from(totals.entries()).map(([id,committees])=>({bioguideId:id,committees}));
  fs.writeFileSync(OUTPUT,JSON.stringify(results,null,2));
  console.log(`Wrote ${OUTPUT} with ${results.length} senator entries.`);
}
run();
