// === GLOBAL STATE ===
let selectedState = 'North Carolina';
let governors = [], ltGovernors = [], senators = [], houseReps = [], cabinet = [];
let officialsContainer = null, searchBar = null;

// === TAB SWITCHER ===
function showTab(id) {
  document.querySelectorAll('.tab-content').forEach(tab => tab.style.display = 'none');
  const el = document.getElementById(id);
  if (el) el.style.display = 'block';
  document.querySelectorAll('.tabs button').forEach(b => b.classList.remove('active'));
  document.querySelector(`.tabs button[onclick="showTab('${id}')"]`)?.classList.add('active');
}

// === RENDER OFFICIALS (YOUR LOGIC, CLEANED) ===
function renderOfficials(stateFilter = null, query = '') {
  showTab('my-officials');
  if (!officialsContainer) officialsContainer = document.getElementById('officials-container');
  if (!officialsContainer) return;
  officialsContainer.innerHTML = '';

  const q = query.toLowerCase();
  const filterState = stateFilter || selectedState;

  const all = [
    ...governors.filter(o => o.state === filterState),
    ...ltGovernors.filter(o => o.state === filterState),
    ...senators.filter(o => o.state === filterState),
    ...houseReps.filter(o => o.state === filterState).sort((a,b) => +a.district - +b.district)
  ].filter(o => !q || o.name.toLowerCase().includes(q) || o.office.toLowerCase().includes(q));

  all.forEach(o => {
    const card = document.createElement('div');
    card.className = 'official-card';
    card.innerHTML = `
      <div class="card-body">
        <div class="photo-wrapper">
          <img src="${o.photo || 'assets/default-photo.png'}" alt="${o.name}" onerror="this.src='assets/default-photo.png'">
        </div>
        <div class="official-info">
          <h3>${o.name}</h3>
          <p><strong>Position:</strong> ${o.office}</p>
          ${o.district ? `<p><strong>District:</strong> ${o.district}</p>` : ''}
          <p><strong>Term:</strong> ${o.termStart?.slice(0,4)}–${o.termEnd?.slice(0,4) || 'Present'}</p>
          <p><strong>Party:</strong> ${o.party}</p>
        </div>
      </div>
    `;
    card.onclick = () => openOfficialModal(o);
    officialsContainer.appendChild(card);
  });
}

// === YOUR ORIGINAL FUNCTIONS (showVoting, showPolls, etc.) ===
// KEEP THEM EXACTLY AS YOU HAD — just indented better

// === DOM READY ===
document.addEventListener('DOMContentLoaded', () => {
  officialsContainer = document.getElementById('officials-container');
  searchBar = document.getElementById('search-bar');

  // Populate state dropdown
  const states = ["Alabama", "Alaska", /* ... */ "North Carolina"];
  const dd = document.getElementById('state-dropdown');
  states.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s; opt.textContent = s;
    if (s === 'North Carolina') opt.selected = true;
    dd.appendChild(opt);
  });

  dd.onchange = () => { selectedState = dd.value; renderOfficials(); };

  // Load your JSONs
  Promise.all([
    fetch('governors.json').then(r => r.json()),
    fetch('ltgovernors.json').then(r => r.json()),
    fetch('senators.json').then(r => r.json()),
    fetch('housereps.json').then(r => r.json())
  ]).then(([g, l, s, h]) => {
    governors = g; ltGovernors = l; senators = s; houseReps = h;
    renderOfficials();
  });
});
