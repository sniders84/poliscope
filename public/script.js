// GLOBAL STATE
let selectedState = 'North Carolina';
let governors = [], ltGovernors = [], senators = [], houseReps = [], cabinet = [];
let officialsContainer = null, searchBar = null;

// TAB SWITCHER
function showTab(id) {
  document.querySelectorAll('.tab-content').forEach(tab => tab.style.display = 'none');
  const el = document.getElementById(id);
  if (el) el.style.display = 'block';
  document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
  document.querySelector(`.tab[onclick="showTab('${id}')"]`)?.classList.add('active');
}

// RENDER OFFICIALS
function renderOfficials(state = selectedState, query = '') {
  showTab('my-officials');
  if (!officialsContainer) officialsContainer = document.getElementById('officials-container');
  if (!officialsContainer) return;
  officialsContainer.innerHTML = '';

  const q = query.toLowerCase();
  const all = [
    ...governors.filter(o => o.state === state),
    ...ltGovernors.filter(o => o.state === state),
    ...senators.filter(o => o.state === state),
    ...houseReps.filter(o => o.state === state).sort((a,b) => +a.district - +b.district)
  ].filter(o => !q || o.name.toLowerCase().includes(q) || o.office.toLowerCase().includes(q));

  all.forEach(o => {
    const card = document.createElement('div');
    card.className = 'official-card';
    card.setAttribute('data-party', o.party || 'Independent');
    card.innerHTML = `
      <div class="party-stripe"></div>
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

// DOM READY
document.addEventListener('DOMContentLoaded', () => {
  officialsContainer = document.getElementById('officials-container');
  searchBar = document.getElementById('search-bar');

  // Wire controls
  document.getElementById('state-dropdown').onchange = (e) => {
    selectedState = e.target.value;
    renderOfficials();
  };
  searchBar.oninput = (e) => renderOfficials(selectedState, e.target.value);

  // Load data
  Promise.all([
    fetch('governors.json').then(r => r.json()),
    fetch('ltgovernors.json').then(r => r.json()),
    fetch('senators.json').then(r => r.json()),
    fetch('housereps.json').then(r => r.json()),
    fetch('cabinet.json').then(r => r.json())
  ]).then(([g, l, s, h, c]) => {
    governors = g; ltGovernors = l; senators = s; houseReps = h; cabinet = c;
    renderOfficials();
  });
});

// STUBS (you can fill later)
function showCivic() { showTab('civic'); }
function showPolls() { showTab('polls'); }
function showOrganizations() { showTab('organizations'); }
function showVoting() { showTab('voting'); }
function openOfficialModal(o) { console.log(o); }
function closeModalWindow(id) { document.getElementById(id).style.display = 'none'; }
