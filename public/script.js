// ---------------- UTILITIES ----------------
function openModal(content){
  const overlay=document.getElementById('modal-overlay');
  const modal=document.getElementById('modal-content');
  if(overlay&&modal){modal.innerHTML=content;overlay.style.display='flex';}
}
function closeModal(){
  const overlay=document.getElementById('modal-overlay');
  if(overlay) overlay.style.display='none';
}

// ---------------- TAB HANDLING ----------------
window.showTab=function(tabId){
  document.querySelectorAll('section').forEach(sec=>sec.style.display='none');
  const t=document.getElementById(tabId);
  if(t) t.style.display='block';
};

// ---------------- RENDER HELPERS ----------------
function renderCards(arr,containerId){
  const container=document.getElementById(containerId);
  if(!container) return;
  container.innerHTML=arr.map(p=>{
    const link=p.ballotpediaLink||p.contact?.website||null;
    return `<div class="card">
      <img src="${p.photo||'https://via.placeholder.com/200x300?text=No+Photo'}" alt="${p.name}" />
      <h3>${p.name}</h3>
      <p><strong>Office:</strong> ${p.office||p.position||''}</p>
      <p><strong>State:</strong> ${p.state}</p>
      <p><strong>Party:</strong> ${p.party||'—'}</p>
      <p><strong>Term:</strong> ${p.termStart||'—'} to ${p.termEnd||'—'}</p>
      ${link?`<p><a href="${link}" target="_blank">Profile</a></p>`:''}
    </div>`;
  }).join('');
}

function isRookie(person){
  const termStartStr=person.termStart?String(person.termStart):'';
  const year=termStartStr.slice(0,4);
  return person.firstTerm===true||person.rookie===true||person.newlyElected===true||year==="2025";
}

// ---------------- RANKINGS ----------------
function renderRankings(){
  const senators=allOfficials.filter(p=>(p.office||'').toLowerCase().includes('senator'));
  const house=allOfficials.filter(p=>(p.office||p.position||'').toLowerCase().includes('rep'));
  const governors=allOfficials.filter(p=>(p.office||'').toLowerCase().includes('governor')&&! (p.office||'').toLowerCase().includes('lt'));
  const ltGovernors=allOfficials.filter(p=>(p.office||'').toLowerCase().includes('lt'));
  renderCards(senators,'rankings-senators');
  renderCards(house,'rankings-house');
  renderCards(governors,'rankings-governors');
  renderCards(ltGovernors,'rankings-ltgovernors');

  const top10=[...allOfficials].slice(0,10);
  renderCards(top10,'top10-overall');
}

// ---------------- ROOKIES ----------------
function renderRookies(){
  const senators=allOfficials.filter(p=>(p.office||'').toLowerCase().includes('senator')&&isRookie(p));
  const house=allOfficials.filter(p=>(p.office||p.position||'').toLowerCase().includes('rep')&&isRookie(p));
  const governors=allOfficials.filter(p=>(p.office||'').toLowerCase().includes('governor')&&! (p.office||'').toLowerCase().includes('lt')&&isRookie(p));
  const ltGovernors=allOfficials.filter(p=>(p.office||'').toLowerCase().includes('lt')&&isRookie(p));
  renderCards(senators,'rookie-senators');
  renderCards(house,'rookie-house');
  renderCards(governors,'rookie-governors');
  renderCards(ltGovernors,'rookie-ltgovernors');
}

// ---------------- MY OFFICIALS ----------------
function renderMyOfficials(state){
  const matches=allOfficials.filter(p=>(p.state||'')===state);
  renderCards(matches,'my-cards');
}

// ---------------- COMPARE ----------------
function populateCompareDropdowns(){
  const left=document.getElementById('compare-left');
  const right=document.getElementById('compare-right');
  if(!left||!right) return;
  left.innerHTML='<option value="">Select official A</option>';
  right.innerHTML='<option value="">Select official B</option>';
  allOfficials.forEach(p=>{
    const label=`${p.name} (${p.state}${p.party?', '+p.party:''})`;
    left.add(new Option(label,p.slug));
    right.add(new Option(label,p.slug));
  });
  left.addEventListener('change',e=>renderCompareCard(e.target.value,'compare-card-left'));
  right.addEventListener('change',e=>renderCompareCard(e.target.value,'compare-card-right'));
}
function renderCompareCard(slug,containerId){
  const p=allOfficials.find(o=>o.slug===slug);
  const container=document.getElementById(containerId);
  if(!container) return;
  if(!p){container.innerHTML='<p>No official selected.</p>';return;}
  const link=p.ballotpediaLink||p.contact?.website||null;
  container.innerHTML=`<div class="card"><img src="${p.photo||'https://via.placeholder.com/200x300?text=No+Photo'}" /><h3>${p.name}</h3><p><strong>Office:</strong> ${p.office||p.position||''}</p><p><strong>State:</strong> ${p.state}</p><p><strong>Party:</strong> ${p.party||'—'}</p><p><strong>Term:</strong> ${p.termStart||'—'} to ${p.termEnd||'—'}</p>${link?`<p><a href="${link}" target="_blank">External Profile</a></p>`:''}</div>`;
}

// ---------------- MATCHUPS ----------------
async function populateMatchupStates(){
  const matchupSelect=document.getElementById("matchup-state");
  if(!matchupSelect) return;
  matchupSelect.innerHTML='<option value="">Choose a state</option>';
  const stateSet=new Set(allOfficials.map(o=>o.state));
  Array.from(stateSet).sort().forEach(s=>{
    const o=document.createElement("option");
    o.value=s;o.textContent=s;
    matchupSelect.appendChild(o);
  });
}
async function showMatchupOfficials(state){
  const container=document.getElementById("compare-container");
  if(!container) return;
  container.innerHTML='';
  if(!state) return;
  allOfficials.filter(o=>o.state===state).forEach(o=>{
    const card=document.createElement("div");
    card.className="official-card";
    card.innerHTML=`<h3>${o.name}</h3><p>${o.office||o.position||''} - ${o.party||''}</p>`;
    container.appendChild(card);
  });
}

// ---------------- DATA LOADING ----------------
function waitForHouseData(){
  return new Promise(resolve=>{
    const check=()=>{if(window.cleanedHouse&&Array.isArray(window.cleanedHouse)) resolve(); else setTimeout(check,50);}
    check();
  });
}
async function loadData(){
  try{
    await waitForHouseData();
    const house=window.cleanedHouse||[];
    const governors=await fetch('public/Governors.json').then(r=>r.json()).catch(()=>[]);
    const senate=await fetch('public/Senate.json').then(r=>r.json()).catch(()=>[]);
    const ltGovernors=await fetch('public/LtGovernors.json').then(r=>r.json()).catch(()=>[]);
    window.allOfficials=[...house,...governors,...senate,...ltGovernors];
    allOfficials=window.allOfficials;

    populateCompareDropdowns();
    renderRankings();
    renderRookies();

    const stateSelect=document.getElementById('state-select');
    const defaultState=stateSelect?.value||'Alabama';
    renderMyOfficials(defaultState);

    if(stateSelect){
      const states=[...new Set(allOfficials.map(p=>p.state).filter(Boolean))].sort();
      stateSelect.innerHTML='<option value="">Choose a state</option>'+states.map(s=>`<option value="${s}">${s}</option>`).join('');
      stateSelect.value='Alabama';
      stateSelect.addEventListener('change',e=>{renderMyOfficials(e.target.value);});
    }
    populateMatchupStates();
  }catch(err){console.error("Error loading data:",err);}
}

// ---------------- DOM READY ----------------
document.addEventListener('DOMContentLoaded',()=>{
  loadData();
  const overlay=document.getElementById('modal-overlay');
  if(overlay) overlay.addEventListener('click',e=>{if(e.target===overlay) closeModal();});
  const matchupSelect=document.getElementById("matchup-state");
  if(matchupSelect) matchupSelect.addEventListener("change",e=>showMatchupOfficials(e.target.value));
});
