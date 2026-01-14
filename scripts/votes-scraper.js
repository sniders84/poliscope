/**
 * Votes scraper (Senate-only, Congress.gov API)
 * - Fetches roll call votes across all sessions
 * - Aggregates total votes, missed votes per senator
 * - Outputs public/senators-votes.json
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY=process.env.CONGRESS_API_KEY;
const CONGRESS=process.env.CONGRESS_NUMBER||'119';
const OUT_PATH=path.join('public','senators-votes.json');

if(!API_KEY)throw new Error('Missing CONGRESS_API_KEY env.');

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

async function run
