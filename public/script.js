// ---------------- TABS ----------------
window.showTab = function(id) {
  const sections = ['my-officials', 'compare', 'rankings', 'rookies', 'calendar', 'registration'];
  sections.forEach(sectionId => {
    const el = document.getElementById(sectionId);
    if (el) el.style.display = sectionId === id ? 'block' : 'none';
  });

  const results = document.getElementById('results');
  if (results) results.innerHTML = '';
  const search = document.getElementById('search');
  if (search) search.value = '';
};

// ---------------- ROOKIE LOGIC ----------------
function isRookie(person) {
  const termStartStr = typeof person.termStart === 'string' ? person.termStart : '';
  const year = termStartStr.slice(0, 4);

  return (
    person.firstTerm === true ||
    year === "2025" ||
    person.rookie === true ||
    person.newlyElected === true
  );
}

// ---------------- CALENDAR EVENTS ----------------
const calendarEvents = [
  { title: "General Election", date: "2025-11-04", state: "Alabama", type: "Election", link: "https://www.vote411.org/upcoming/1/events", details: "Statewide general election including Governor and House seats." },
  { title: "Municipal Runoff Election (if needed)", date: "2025-10-07", state: "Alabama", type: "Election", link: "https://www.sos.alabama.gov/alabama-votes/voter/election-information/2025", details: "Runoff elections for municipalities where no candidate received a majority." },
  { title: "Town Hall with Gov. Kay Ivey", date: "2025-10-15", state: "Alabama", type: "Public Engagement", link: "https://governor.alabama.gov/newsroom/", details: "Public Q&A session in Montgomery. Open to all residents." },
  { title: "Last Day to Register for General Election", date: "2025-10-21", state: "Alabama", type: "Deadline", link: "https://www.sos.alabama.gov/alabama-votes/voter/register-to-vote", details: "Deadline to register to vote in the November 4 general election." },
  { title: "Signed 'Working for Alabama' Legislative Package", date: "2025-05-01", state: "Alabama", type: "Bill Signing", link: "https://governor.alabama.gov/newsroom/2024/05/governor-ivey-signs-landmark-working-for-alabama-legislative-package-into-law/", details: "Six-bill package to boost workforce participation, childcare access, and rural job growth." }
];

// ---------------- VOTING INFO ----------------
const votingInfo = {
  "Alabama": {
    registrationLink: "https://www.sos.alabama.gov/alabama-votes/voter/register-to-vote",
    statusCheckLink: "https://myinfo.alabamavotes.gov/voterview/",
    pollingPlaceLink: "https://myinfo.alabamavotes.gov/voterview/",
    volunteerLink: "https://www.sos.alabama.gov/alabama-votes/become-poll-worker",
    absenteeLink: "https://www.sos.alabama.gov/alabama-votes/voter/absentee-voting",
    registrationDeadline: "2025-10-21",
    absenteeRequestDeadline: "2025-10-29",
    absenteeReturnDeadline: "2025-11-04 12:00 PM",
    earlyVotingStart: null,
    earlyVotingEnd: null
  }
};

// ---------------- GLOBAL STATE ----------------
let allOfficials = [];

// ---------------- UTILITIES ----------------
function escapeJs(str = '') {
  return String(str).replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
}

// ---------------- MODAL ----------------
function openModal(person) {
  const modalContent = document.getElementById('modal-content');
  if (!modalContent) return;

  const link = person.ballotpediaLink || person.contact?.website || '';
  let billsHTML = '';
  if (person.billsSigned?.length) {
    billsHTML = `<p><strong>Key Bills Signed:</strong></p><ul>${person.billsSigned.map(b => `<li><a href="${b.link}" target="_blank" rel="noopener noreferrer">${b.title}</a></li>`).join('')}</ul>`;
  }

  let followThroughHTML = '';
  if (person.platformFollowThrough && Object.keys(person.platformFollowThrough).length) {
    followThroughHTML = `<div class="platform-followthrough"><h3>Platform Follow-Through</h3><ul>${Object.entries(person.platformFollowThrough).map(([k,v]) => `<li><strong>${k}:</strong> ${v}</li>`).join('')}</ul></div>`;
  }

  modalContent.innerHTML = `
    <div class="modal-container">
      <div class="modal-left">
        <img src="${person.photo || 'https://via.placeholder.com/200x300?text=No+Photo'}" />
        <h2>${person.name}</h2>
        ${link ? `<p><a href="${link}" target="_blank" rel="noopener noreferrer">External Profile</a></p>` : ''}
        <p><strong>Contact:</strong>
          ${person.contact?.email ? `<a href="mailto:${person.contact.email}" class="contact-icon">📧</a>` : ''}
          ${person.contact?.phone ? `<a href="tel:${person.contact.phone.replace(/[^0-9]/g, '')}" class="contact-icon">📞</a>` : ''}
          ${person.contact?.website ? `<a href="${person.contact.website}" target="_blank" rel="noopener noreferrer" class="contact-icon">🌐</a>` : ''}
        </p>
      </div>
      <div class="modal-right">
        ${person.bio ? `<p><strong>Bio:</strong> ${person.bio}</p>` : ''}
        ${person.education ? `<p><strong>Education:</strong> ${person.education}</p>` : ''}
        ${person.endorsements ? `<p><strong>Endorsements:</strong> ${person.endorsements}</p>` : ''}
        ${person.platform ? `<p><strong>Platform:</strong> ${person.platform}</p>` : ''}
        ${followThroughHTML}
        ${person.proposals ? `<p><strong>Legislative Proposals:</strong> ${person.proposals}</p>` : ''}
        ${billsHTML}
        ${person.vetoes ? `<p><strong>Vetoes:</strong> ${person.vetoes}</p>` : ''}
        ${person.salary ? `<p><strong>Salary:</strong> ${person.salary}</p>` : ''}
        ${person.predecessor ? `<p><strong>Predecessor:</strong> ${person.predecessor}</p>` : ''}
        ${person.donationLink ? `<p><strong>Donate:</strong> <a href="${person.donationLink}" target="_blank" rel="noopener noreferrer">💸</a></p>` : ''}
        <p><button id="modal-close-btn">Close</button></p>
      </div>
    </div>
  `;

  const overlay = document.getElementById('modal-overlay');
  if (overlay) overlay.style.display = 'flex';

  document.getElementById('modal-close-btn').addEventListener('click', closeModal);
}

function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  if (overlay) overlay.style.display = 'none';
  const modalContent = document.getElementById('modal-content');
  if (modalContent) modalContent.innerHTML = '';
}

// ---------------- RENDER CARDS ----------------
function renderCards(data, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const cardsHTML = data.map(person => {
    const partyLower = (person.party || '').toLowerCase();
    const partyColor = partyLower.includes("repub") ? "#d73027" :
                       partyLower.includes("dem") ? "#4575b4" :
                       partyLower.includes("libert") ? "#fdae61" :
                       partyLower.includes("indep") ? "#999999" :
                       partyLower.includes("green") ? "#66bd63" :
                       partyLower.includes("constit") ? "#984ea3" :
                       "#cccccc";

    return `
      <div class="card" data-slug="${person.slug}" onclick="openModal(allOfficials.find(p => p.slug === '${person.slug}'))" style="border-left: 8px solid ${partyColor};">
        <img src="${person.photo || 'https://via.placeholder.com/200x300?text=No+Photo'}" />
        <h3>${person.name}</h3>
        <p>${person.office || person.position || ''}</p>
        <p>${person.state}${person.party ? ', ' + person.party : ''}</p>
      </div>
    `;
  }).join('');

  container.innerHTML = cardsHTML;
}

// ---------------- RENDER FUNCTIONS ----------------
function renderMyOfficials(state) {
  const matches = allOfficials.filter(p => [p.state, p.stateName, p.stateAbbreviation].includes(state));
  const roleOrder = ['senator', 'representative', 'governor', 'lt. governor', 'lt governor', 'ltgovernor', 'lieutenant governor'];
  matches.sort((a,b) => roleOrder.indexOf((a.office||a.position||'').toLowerCase()) - roleOrder.indexOf((b.office||b.position||'').toLowerCase()));
  renderCards(matches, 'my-cards');
}

function renderLtGovernors(data) {
  renderCards(data, 'lt-governors-container');
}

function renderRankings() {
  const governors = allOfficials.filter(p => ((p.office||'').toLowerCase().includes("governor") && !((p.office||'').toLowerCase().includes("lt"))));
  const ltGovernors = allOfficials.filter(p => ["lt. governor","lt governor","ltgovernor","lieutenant governor"].some(r => (p.office||'').toLowerCase().includes(r)));
  const senators = allOfficials.filter(p => (p.office||'').toLowerCase().includes("senator"));
  const house = allOfficials.filter(p => (p.office||'').toLowerCase().includes("representative"));

  renderCards(governors,'rankings-governors');
  renderCards(ltGovernors,'rankings-ltgovernors');
  renderCards(senators,'rankings-senators');
  renderCards(house,'rankings-house');
}

function renderRookies() {
  const rookies = allOfficials.filter(isRookie);
  const groups = { governor: [], ltgovernor: [], senator: [], representative: [] };
  rookies.forEach(p => {
    const role = (p.office||'').toLowerCase();
    if (role.includes("senator")) groups.senator.push(p);
    else if (role.includes("representative") || role.includes("house")) groups.representative.push(p);
    else if (["lt. governor","lt governor","ltgovernor","lieutenant governor"].some(r => role.includes(r))) groups.ltgovernor.push(p);
    else if (role.includes("governor")) groups.governor.push(p);
  });
  renderCards(groups.governor,'rookie-governors');
  renderCards(groups.ltgovernor,'rookie-ltgovernors');
  renderCards(groups.senator,'rookie-senators');
  renderCards(groups.representative,'rookie-house');
}

// ---------------- CALENDAR ----------------
function renderCalendar(events, state) {
  const container = document.getElementById('calendar-container');
  if (!container) return;
  const today = new Date();
  const filtered = events.filter(e => e.state===state && new Date(e.date)>=today).sort((a,b)=>new Date(a.date)-new Date(b.date));
  container.innerHTML = filtered.map(e=>`<div class="card" onclick="openEventModal('${escapeJs(e.title)}','${e.date}','${escapeJs(e.state)}','${escapeJs(e.type)}','${escapeJs(e.details)}','${e.link}')"><h3>${e.title}</h3><p><strong>Date:</strong> ${e.date}</p><p><strong>Type:</strong> ${e.type}</p></div>`).join('') || `<p>No upcoming events for ${state}.</p>`;
}

function openEventModal(title,date,state,type,details,link){
  const modalContent=document.getElementById('modal-content');
  if(!modalContent) return;
  modalContent.innerHTML=`<div class="event-modal"><h2>${title}</h2><p><strong>Date:</strong> ${date}</p><p><strong>State:</strong> ${state}</p><p><strong>Type:</strong> ${type}</p><p>${details}</p><p><a href="${link}" target="_blank" rel="noopener noreferrer">More Info</a></p><p><button id="event-modal-close">Close</button></p></div>`;
  const overlay=document.getElementById('modal-overlay'); if(overlay) overlay.style.display='flex';
  document.getElementById('event-modal-close').addEventListener('click',closeModal);
}

// ---------------- VOTING ----------------
function renderVotingInfo(state){
  const container=document.getElementById('voting-container');
  if(!container || !votingInfo[state]) { if(container) container.innerHTML=`<p>No voting info available for ${state}.</p>`; return;}
  const info=votingInfo[state];
  container.innerHTML=`<div class="card"><h3>Register to Vote</h3><p><a href="${info.registrationLink}" target="_blank">Register Online</a></p><p><a href="${info.statusCheckLink}" target="_blank">Check Registration Status</a></p><p><strong>Deadline:</strong> ${info.registrationDeadline}</p></div><div class="card"><h3>Find Your Polling Place</h3><p><a href="${info.pollingPlaceLink}" target="_blank">Polling Place Lookup</a></p>${info.earlyVotingStart?`<p><strong>Early Voting:</strong> ${info.earlyVotingStart} to ${info.earlyVotingEnd}</p>`:'<p><em>Early voting not available statewide.</em></p>'}</div><div class="card"><h3>Vote by Mail</h3><p><a href="${info.absenteeLink}" target="_blank">Request Absentee Ballot</a></p><p><strong>Request Deadline:</strong> ${info.absenteeRequestDeadline}</p><p><strong>Return Deadline:</strong> ${info.absenteeReturnDeadline}</p><p>Must include a copy of valid photo ID.</p></div><div class="card"><h3>Volunteer</h3><p><a href="${info.volunteerLink}" target="_blank">Become a Poll Worker</a></p></div>`;
}

// ---------------- DATA LOADING ----------------
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
    renderCalendar(calendarEvents,defaultState);
    renderVotingInfo(defaultState);

    if(stateSelect){
      const states=[...new Set(allOfficials.map(p=>p.state).filter(Boolean))].sort();
      stateSelect.innerHTML='<option value="">Choose a state</option>'+states.map(s=>`<option value="${s}">${s}</option>`).join('');
      stateSelect.value='Alabama';
      stateSelect.addEventListener('change',e=>{
        const s=e.target.value;
        renderMyOfficials(s);
        renderCalendar(calendarEvents,s);
        renderVotingInfo(s);
      });
    }

    populateMatchupStates();
  }catch(err){console.error("Error loading data:",err);}
}

function waitForHouseData(){
  return new Promise(resolve=>{
    const check=()=>{if(window.cleanedHouse && Array.isArray(window.cleanedHouse)) resolve(); else setTimeout(check,50);}
    check();
  });
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
  container.innerHTML=`<div class="card"><img src="${p.photo||'https://via.placeholder.com/200x300?text=No+Photo'}" /><h3>${p.name}</h3><p><strong>Office:</strong> ${p.office||p.position||''}</p><p><strong>State:</strong> ${p.state}</p><p><strong>Party:</strong> ${p.party||'—'}</p><p><strong>Term:</strong> ${p.termStart||'—'} to ${p.termEnd||'—'}</p>${link?`<p><a href="${link}" target="_blank" rel="noopener noreferrer">External Profile</a></p>`:''}</div>`;
}

// ---------------- MATCHUP ----------------
async function populateMatchupStates(){
  const matchupSelect=document.getElementById("matchup-state");
  if(!matchupSelect) return;
  matchupSelect.innerHTML='<option value="">Choose a state</option>';
  const stateSet=new Set();
  const files=['public/Governors.json','public/LtGovernors.json','public/Senate.json','public/House.json'];
  for(const f of files){const data=await fetch(f).then(r=>r.json());data.forEach(o=>stateSet.add(o.state));}
  Array.from(stateSet).sort().forEach(s=>{const o=document.createElement("option");o.value=s;o.textContent=s;matchupSelect.appendChild(o);});
}

async function showMatchupOfficials(state){
  const container=document.getElementById("compare-container");
  if(!container) return;
  container.innerHTML='';
  if(!state) return;
  const files=[{file:'public/Governors.json',type:'Governor'},{file:'public/LtGovernors.json',type:'Lt. Governor'},{file:'public/Senate.json',type:'Senator'},{file:'public/House.json',type:'House Representative'}];
  for(const {file,type} of files){
    const data=await fetch(file).then(r=>r.json());
    data.filter(o=>o.state===state).forEach(o=>{
      const card=document.createElement("div");
      card.className="official-card";
      card.innerHTML=`<h3>${o.name}</h3><p>${type} - ${o.party}</p>`;
      container.appendChild(card);
    });
  }
}

document.addEventListener('DOMContentLoaded',()=>{
  loadData();
  const overlay=document.getElementById('modal-overlay');
  if(overlay) overlay.addEventListener('click',e=>{if(e.target===overlay) closeModal();});

  // Tab wiring
  document.querySelectorAll('.tab-button').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelectorAll('.tab-button').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      window.showTab(btn.getAttribute('data-tab'));
    });
  });
  const firstTab=document.querySelector('.tab-button');
  if(firstTab){firstTab.classList.add('active'); window.showTab(firstTab.getAttribute('data-tab'));}

  // Search
  const search=document.getElementById('search');
  const results=document.getElementById('results');
  if(search){
    search.addEventListener('input',e=>{
      const q=e.target.value.toLowerCase().trim();
      if(!q){if(results) results.innerHTML=''; return;}
      const matches=allOfficials.filter(p=>(p.name||'').toLowerCase().includes(q)||(p.state||'').toLowerCase().includes(q)||(p.party||'').toLowerCase().includes(q));
      results.innerHTML=matches.map(p=>{const label=`${p.name} (${p.state}${p.party?', '+p.party:''})`;const link=p.ballotpediaLink||p.contact?.website||null; return link?`<li><a href="${link}" target="_blank">${label}</a></li>`:`<li>${label}</li>`;}).join('')||`<li>No matches for "${q}"</li>`;
    });
    document.addEventListener('click',e=>{if(!search.contains(e.target) && !results.contains(e.target)){results.innerHTML=''; search.value='';}});
  }

  const matchupSelect=document.getElementById("matchup-state");
  if(matchupSelect) matchupSelect.addEventListener("change",e=>showMatchupOfficials(e.target.value));
});
