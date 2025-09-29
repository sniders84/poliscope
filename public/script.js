// -----------------------------
// --- Tabs (single canonical function) --- 
// -----------------------------
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

// -----------------------------
// --- Rookie Logic --- 
// -----------------------------
function isRookie(person) {
  const year = (person.termStart || '').slice(0, 4);
  return person.firstTerm === true || person.rookie === true || person.newlyElected === true || year === "2025";
}

// -----------------------------
// --- Calendar Events --- 
// -----------------------------
const calendarEvents = [
  {
    title: "General Election",
    date: "2025-11-04",
    state: "Alabama",
    type: "Election",
    link: "https://www.vote411.org/upcoming/1/events",
    details: "Statewide general election including Governor and House seats."
  },
  {
    title: "Municipal Runoff Election (if needed)",
    date: "2025-10-07",
    state: "Alabama",
    type: "Election",
    link: "https://www.sos.alabama.gov/alabama-votes/voter/election-information/2025",
    details: "Runoff elections for municipalities where no candidate received a majority."
  },
  {
    title: "Town Hall with Gov. Kay Ivey",
    date: "2025-10-15",
    state: "Alabama",
    type: "Public Engagement",
    link: "https://governor.alabama.gov/newsroom/",
    details: "Public Q&A session in Montgomery. Open to all residents."
  },
  {
    title: "Last Day to Register for General Election",
    date: "2025-10-21",
    state: "Alabama",
    type: "Deadline",
    link: "https://www.sos.alabama.gov/alabama-votes/voter/register-to-vote",
    details: "Deadline to register to vote in the November 4 general election."
  },
  {
    title: "Signed 'Working for Alabama' Legislative Package",
    date: "2025-05-01",
    state: "Alabama",
    type: "Bill Signing",
    link: "https://governor.alabama.gov/newsroom/2024/05/governor-ivey-signs-landmark-working-for-alabama-legislative-package-into-law/",
    details: "Six-bill package to boost workforce participation, childcare access, and rural job growth."
  }
];

// -----------------------------
// --- Voting Info --- 
// -----------------------------
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

// -----------------------------
// --- Global State --- 
// -----------------------------
let allOfficials = [];

// -----------------------------
// --- UTIL --- 
// -----------------------------
function escapeJs(str = '') {
  return String(str).replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
}

// -----------------------------
// --- MODALS --- 
// -----------------------------
function openModal(person) {
  const modalContent = document.getElementById('modal-content');
  const overlay = document.getElementById('modal-overlay');
  if (!modalContent || !overlay) return;

  let billsHTML = '';
  if (person.billsSigned?.length) {
    billsHTML = `<p><strong>Key Bills Signed:</strong></p><ul>${person.billsSigned.map(bill => `<li><a href="${bill.link}" target="_blank">${bill.title}</a></li>`).join('')}</ul>`;
  }

  let followThroughHTML = '';
  if (person.platformFollowThrough && Object.keys(person.platformFollowThrough).length) {
    followThroughHTML = `<div class="platform-followthrough"><h3>Platform Follow-Through</h3><ul>${Object.entries(person.platformFollowThrough).map(([key, value]) => `<li><strong>${key}:</strong> ${value}</li>`).join('')}</ul></div>`;
  }

  const imageUrl = person.photo || 'https://via.placeholder.com/200x300?text=No+Photo';
  const link = person.ballotpediaLink || person.contact?.website || '';

  modalContent.innerHTML = `
    <div class="modal-container">
      <div class="modal-left">
        <img src="${imageUrl}" />
        <h2>${person.name}</h2>
        ${link ? `<p><a href="${link}" target="_blank">External Profile</a></p>` : ''}
      </div>
      <div class="modal-right">
        ${person.office ? `<p><strong>Office:</strong> ${person.office}</p>` : ''}
        ${person.bio ? `<p><strong>Bio:</strong> ${person.bio}</p>` : ''}
        ${billsHTML}
        ${followThroughHTML}
        <p><button id="modal-close-btn">Close</button></p>
      </div>
    </div>
  `;
  overlay.style.display = 'flex';
  document.getElementById('modal-close-btn').addEventListener('click', closeModal);
}

function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  const modalContent = document.getElementById('modal-content');
  if (overlay) overlay.style.display = 'none';
  if (modalContent) modalContent.innerHTML = '';
}

// -----------------------------
// --- Render Functions --- 
// -----------------------------
function renderCards(data, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = '';
  data.forEach(person => {
    const partyLower = (person.party || '').toLowerCase();
    const partyColor = partyLower.includes("repub") ? "#d73027" :
                       partyLower.includes("dem") ? "#4575b4" :
                       partyLower.includes("libert") ? "#fdae61" :
                       partyLower.includes("indep") ? "#999999" :
                       partyLower.includes("green") ? "#66bd63" :
                       partyLower.includes("constit") ? "#984ea3" :
                       "#cccccc";

    const card = document.createElement('div');
    card.className = 'card';
    card.style.borderLeft = `8px solid ${partyColor}`;
    card.innerHTML = `
      <img src="${person.photo || 'https://via.placeholder.com/200x300?text=No+Photo'}" />
      <h3>${person.name}</h3>
      <p>${person.office || ''}</p>
      <p>${person.state}${person.party ? ', ' + person.party : ''}</p>
    `;
    card.addEventListener('click', () => openModal(person));
    container.appendChild(card);
  });
}

// -----------------------------
// --- My Officials --- 
// -----------------------------
function renderMyOfficials(state) {
  const matches = allOfficials.filter(p => p.state === state);
  const roleOrder = ['senator','representative','governor','lt. governor','lt governor','ltgovernor','lieutenant governor'];

  matches.sort((a,b)=>{
    const roleA = (a.office||'').toLowerCase();
    const roleB = (b.office||'').toLowerCase();
    const indexA = roleOrder.findIndex(r=>roleA.includes(r));
    const indexB = roleOrder.findIndex(r=>roleB.includes(r));
    return indexA-indexB;
  });

  renderCards(matches,'my-cards');
}

// -----------------------------
// --- Rankings & Rookies --- 
// -----------------------------
function renderRankings() {
  const governorRankings = allOfficials.filter(p => p.office?.toLowerCase().includes('governor') && !p.office.toLowerCase().includes('lt'));
  const ltGovernorRankings = allOfficials.filter(p => /lt\.? governor|lieutenant governor/i.test(p.office || ''));
  const senators = allOfficials.filter(p => /senator/i.test(p.office||''));
  const house = allOfficials.filter(p => /representative/i.test(p.office||''));

  renderCards(governorRankings,'rankings-governors');
  renderCards(ltGovernorRankings,'rankings-ltgovernors');
  renderCards(senators,'rankings-senators');
  renderCards(house,'rankings-house');
}

function renderRookies() {
  const rookies = allOfficials.filter(isRookie);
  const groups = { governor:[], ltgovernor:[], senator:[], representative:[] };

  rookies.forEach(p=>{
    const role = (p.office||'').toLowerCase();
    if(role.includes('senator')) groups.senator.push(p);
    else if(role.includes('representative') || role.includes('house')) groups.representative.push(p);
    else if(/lt\.? governor|lieutenant governor/i.test(role)) groups.ltgovernor.push(p);
    else if(role.includes('governor')) groups.governor.push(p);
  });

  renderCards(groups.governor,'rookie-governors');
  renderCards(groups.ltgovernor,'rookie-ltgovernors');
  renderCards(groups.senator,'rookie-senators');
  renderCards(groups.representative,'rookie-house');
}

// -----------------------------
// --- Compare Dropdowns --- 
// -----------------------------
function populateCompareDropdowns() {
  const left = document.getElementById('compare-left');
  const right = document.getElementById('compare-right');
  if(!left || !right) return;

  left.innerHTML = '<option value="">Select official A</option>';
  right.innerHTML = '<option value="">Select official B</option>';

  allOfficials.forEach(p=>{
    const label = `${p.name} (${p.state}${p.party ? ', ' + p.party : ''})`;
    left.add(new Option(label,p.slug));
    right.add(new Option(label,p.slug));
  });

  left.addEventListener('change', e => renderCompareCard(e.target.value,'compare-card-left'));
  right.addEventListener('change', e => renderCompareCard(e.target.value,'compare-card-right'));
}

function renderCompareCard(slug, containerId) {
  const person = allOfficials.find(p=>p.slug===slug);
  const container = document.getElementById(containerId);
  if(!container) return;
  if(!person){ container.innerHTML='<p>No official selected.</p>'; return; }

  container.innerHTML = `
    <div class="card">
      <img src="${person.photo || 'https://via.placeholder.com/200x300?text=No+Photo'}" />
      <h3>${person.name}</h3>
      <p><strong>Office:</strong> ${person.office||''}</p>
      <p><strong>State:</strong> ${person.state}</p>
      <p><strong>Party:</strong> ${person.party||'—'}</p>
      <p><strong>Term:</strong> ${person.termStart||'—'} to ${person.termEnd||'—'}</p>
      ${person.ballotpediaLink ? `<p><a href="${person.ballotpediaLink}" target="_blank">External Profile</a></p>` : ''}
    </div>
  `;
}

// -----------------------------
// --- Load JSON Data --- 
// -----------------------------
async function loadData() {
  try {
    await waitForHouseData();

    const house = window.cleanedHouse || [];
    const governors = await fetch('Governors.json').then(r=>r.json()).catch(()=>[]);
    const senate = await fetch('Senate.json').then(r=>r.json()).catch(()=>[]);
    const ltGovernors = await fetch('LtGovernors.json').then(r=>r.json()).catch(()=>[]);

    allOfficials = [...house,...governors,...senate,...ltGovernors];

    populateCompareDropdowns();
    renderRankings();
    renderRookies();

    const stateSelect = document.getElementById('state-select');
    if(stateSelect){
      const states = [...new Set(allOfficials.map(p=>p.state).filter(Boolean))].sort();
      stateSelect.innerHTML = '<option value="">Choose a state</option>'+states.map(s=>`<option value="${s}">${s}</option>`).join('');
      stateSelect.value = states.includes('Alabama') ? 'Alabama' : states[0] || '';
      const defaultState = stateSelect.value;
      renderMyOfficials(defaultState);
      renderCalendar(calendarEvents, defaultState);
      renderVotingInfo(defaultState);

      stateSelect.addEventListener('change', e=>{
        const s = e.target.value;
        renderMyOfficials(s);
        renderCalendar(calendarEvents,s);
        renderVotingInfo(s);
      });
    }
  } catch(err){ console.error("Error loading data:",err); }
}

function waitForHouseData(){ return new Promise(resolve=>{ const check=()=>{ if(window.cleanedHouse && Array.isArray(window.cleanedHouse)){resolve();}else{setTimeout(check,50);} }; check(); }); }

// -----------------------------
// --- Matchups --- 
// -----------------------------
async function populateMatchupStates(){
  const select = document.getElementById("matchup-state");
  if(!select) return;
  select.innerHTML = '<option value="">Choose a state</option>';
  const files = ['data/governors.json','data/ltgovernors.json','data/senators.json','data/house.json'];
  const stateSet = new Set();
  for(const f of files){
    const data = await fetch(f).then(r=>r.json()).catch(()=>[]);
    data.forEach(o=>stateSet.add(o.state));
  }
  Array.from(stateSet).sort().forEach(s=>{
    const opt = document.createElement('option'); opt.value=s; opt.textContent=s; select.appendChild(opt);
  });
}

async function showMatchupOfficials(state){
  const container = document.getElementById("compare-container");
  if(!container){ return; }
  container.innerHTML = "";
  if(!state) return;

  const files = [
    {file:'data/governors.json',type:'Governor'},
    {file:'data/ltgovernors.json',type:'Lt. Governor'},
    {file:'data/senators.json',type:'Senator'},
    {file:'data/house.json',type:'House Representative'}
  ];

  for(const {file,type} of files){
    const data = await fetch(file).then(r=>r.json()).catch(()=>[]);
    data.filter(o=>o.state===state).forEach(p=>{
      const card = document.createElement('div'); card.className='official-card';
      card.innerHTML = `<h3>${p.name}</h3><p>${type} - ${p.party}</p>`;
      container.appendChild(card);
    });
  }
}

// -----------------------------
// --- DOM Ready --- 
// -----------------------------
document.addEventListener('DOMContentLoaded',function(){
  loadData();
  populateMatchupStates();

  const matchupSelect = document.getElementById("matchup-state");
  if(matchupSelect) matchupSelect.addEventListener('change', e=>showMatchupOfficials(e.target.value));

  const overlay = document.getElementById('modal-overlay');
  if(overlay) overlay.addEventListener('click', e=>{ if(e.target===overlay) closeModal(); });

  // Tab buttons
  document.querySelectorAll('.tab-button').forEach(btn=>{
    btn.addEventListener('click',()=>{ 
      const tab = btn.dataset.tab; 
      document.querySelectorAll('.tab-button').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active'); 
      window.showTab(tab);
    });
  });

  // Default tab
  if(!document.querySelector('.tab-button.active')){
    const first = document.querySelector('.tab-button');
    if(first){ first.classList.add('active'); window.showTab(first.dataset.tab); }
  }
});
