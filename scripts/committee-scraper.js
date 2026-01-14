/**
 * Committee scraper
 * - Reads public/senators-committee-membership-current.json
 * - Aggregates committee memberships per senator
 * - Outputs public/senators-committees.json
 */

const fs = require('fs');
const path = require('path');

const INPUT = path.join('public','senators-committee-membership-current.json');
const OUTPUT = path.join('public','senators-committees.json');

function run(){
  if(!fs.existsSync(INPUT))throw new Error(`Missing ${INPUT}`);
  const committees=JSON.parse(fs.readFileSync(INPUT,'utf8'));
  const totals=new Map();

  for(const [cid,members] of Object.entries(committees)){
    for(const m of members){
      const id=m?.bioguide; if(!id)continue;
      if(!totals.has(id))totals.set(id,[]);
      let role='Member';
      if(m?.title==='Chairman') role='Chair';
      else if(m?.title==='Ranking Member') role='Ranking Member';
      totals.get(id).push({committee:cid,role});
    }
  }

  const results=Array.from(totals.entries()).map(([id,committees])=>({bioguideId:id,committees}));
  if(results.length===0){console.log("No data, skipping write.");process.exit(0);}
  fs.writeFileSync(OUTPUT,JSON.stringify(results,null,2));
  console.log(`Wrote ${OUTPUT} with ${results.length} senator entries.`);
}
run();
