// === GLOBAL STATE ===
let selectedState = 'North Carolina';
let governors = [], ltGovernors = [], senators = [], houseReps = [], cabinet = [];
let federalOfficials = [];
let officialsContainer = null, searchBar = null;

// === STATE ALIASES ===
const stateAliases = { "Virgin Islands": "U.S. Virgin Islands" };

// === POLL CATEGORIES (FULL) ===
const pollCategories = [ /* Your full list from before */ ];

// === TAB SWITCHER ===
function showTab(id) {
  document.querySelectorAll('.tab-content').forEach(tab => tab.style.display = 'none');
  const el = document.getElementById(id);
  if (el) el.style.display = 'block';
  document.querySelectorAll('.tabs button').forEach(b => b.classList.remove('active'));
  document.querySelector(`.tabs button[onclick="showTab('${id}')"]`)?.classList.add('active');
}

// === MY OFFICIALS (STATE ONLY) ===
function renderOfficials(stateFilter = null, query = '') {
  showTab('my-officials');
  if (!officialsContainer) officialsContainer = document.getElementById('officials-container');
  if (!officialsContainer) return;
  officialsContainer.innerHTML = '';

  const q = query.toLowerCase();
  const filterState = stateFilter ? (stateAliases[stateFilter] || stateFilter) : null;

  const stateOfficials = [
    ...governors.filter(o => !filterState || o.state === filterState),
    ...ltGovernors.filter(o => !filterState || o.state === filterState),
    ...senators.filter(o => !filterState || o.state === filterState),
    ...houseReps.filter(o => !filterState || o.state === filterState).sort((a, b) => +a.district - +b.district)
  ].filter(o =>
    !q || o.name?.toLowerCase().includes(q) || o.office?.toLowerCase().includes(q)
  );

  const partyMap = { republican: 'Republican', democrat: 'Democratic', independent: 'Independent' };
  const year = d => d && !isNaN(new Date(d).getTime()) ? new Date(d).getFullYear() : '';

  stateOfficials.forEach(o => {
    const party = partyMap[o.party?.toLowerCase()] || 'Independent';
    const photo = o.photo?.trim() ? o.photo : 'assets/default-photo.png';
    const term = `${year(o.termStart)}–${year(o.termEnd) || 'Present'}`.replace(/^–|–$/g, 'Present');

    const card = document.createElement('div');
    card.className = 'official-card';
    card.dataset.party = party;
    card.innerHTML = `
      <div class="party-stripe" data-party="${party}"></div>
      <div class="card-body">
        <div class="photo-wrapper">
          <img src="${photo}" alt="${o.name}" onerror="this.src='assets/default-photo.png'">
        </div>
        <div class="official-info">
          <h3>${o.name}</h3>
          <p><strong>Position:</strong> ${o.office}</p>
          ${o.district ? `<p><strong>District:</strong> ${o.district}</p>` : ''}
          <p><strong>State:</strong> ${o.state}</p>
          <p><strong>Term:</strong> ${term}</p>
          <p><strong>Party:</strong> ${o.party}</p>
        </div>
      </div>
    `;
    card.onclick = () => openOfficialModal(o);
    officialsContainer.appendChild(card);
  });
}
// === CIVIC INTELLIGENCE TAB ===
function showCivic() {
  showTab('civic');
  const container = document.getElementById('civic-container');
  if (!container) return;

  // === CABINET ===
  const cabinetContainer = document.getElementById('cabinet-container');
  cabinetContainer.innerHTML = '<h3>Executive Cabinet</h3><div id="cabinet-grid"></div>';
  const grid = document.getElementById('cabinet-grid');
  grid.className = 'official-grid';

  cabinet.forEach(member => {
    const card = document.createElement('div');
    card.className = 'official-card';
    card.innerHTML = `
      <div class="card-body">
        <div class="photo-wrapper">
          <img src="${member.photo || 'assets/default-photo.png'}" alt="${member.name}" onerror="this.src='assets/default-photo.png'">
        </div>
        <div class="official-info">
          <h3>${member.name}</h3>
          <p><strong>Position:</strong> ${member.office}</p>
          <p><strong>Department:</strong> ${member.department || 'N/A'}</p>
        </div>
      </div>
    `;
    card.onclick = () => openOfficialModal(member);
    grid.appendChild(card);
  });

  // === CALENDAR ===
  const cal = document.getElementById('calendar');
  cal.innerHTML = `
    <ul>
      <li><strong>2026 Midterms:</strong> November 3, 2026</li>
      <li><strong>2028 Presidential:</strong> November 7, 2028</li>
    </ul>
  `;

  // === CIVIC TOOLS ===
  const tools = document.getElementById('civic-tools');
  tools.innerHTML = `
    <div class="tool-card"><a href="https://vote.gov" target="_blank">vote.gov</a></div>
    <div class="tool-card"><a href="https://ballotpedia.org" target="_blank">Ballotpedia</a></div>
  `;
}

// === ORGANIZATIONS TAB ===
function showOrganizations() {
  showTab('organizations');
  const container = document.getElementById('orgs-container');
  if (!container) return;
  container.innerHTML = '<div class="org-grid"></div>';
  const grid = container.querySelector('.org-grid');

  // Example orgs — replace with your JSON later
  const orgs = [
    { name: "Heritage Foundation", logo: "assets/heritage.png", url: "https://heritage.org" },
    { name: "ACLU", logo: "assets/aclu.png", url: "https://aclu.org" }
  ];

  orgs.forEach(org => {
    const card = document.createElement('div');
    card.className = 'org-card';
    card.innerHTML = `
      <img src="${org.logo}" alt="${org.name}" onerror="this.style.display='none'">
      <p><strong>${org.name}</strong></p>
      <a href="${org.url}" target="_blank">Visit →</a>
    `;
    grid.appendChild(card);
  });
}

// === MODAL, SEARCH, DOM READY === (Same as before, but with cabinet support)
