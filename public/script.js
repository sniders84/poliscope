// GLOBAL STATE
let selectedState = 'North Carolina';
let governors = [];
let ltGovernors = [];
let senators = [];
let houseReps = [];
let officialsContainer = null;
let searchBar = null;

// MODAL REFS
let officialsModal = null;
let officialsModalContent = null;
let officialsModalCloseBtn = null;

// POLL CATEGORIES
const pollCategories = [
  // Your full poll categories here (no changes, just formatted)
  {
    label: 'President',
    polls: [
      { source: 'Ballotpedia', name: 'Ballotpedia – Presidential approval index', url: 'https://ballotpedia.org/Ballotpedia%27s_Polling_Index:_Presidential_approval_rating' },
      // ... all others
    ]
  },
  // ... all categories
];

// DATA LOADING
Promise.all([
  fetch('officials.json').then(res => res.json()),
  fetch('cabinet.json').then(res => res.json())
]).then(([officialsData, cabinetData]) => {
  const allOfficials = [...officialsData, ...cabinetData];
  renderOfficials(allOfficials, 'officialsList');
  searchBar.addEventListener('input', e => searchOfficials(e.target.value, allOfficials));
});

// OPEN MODAL
function openModalWindow(modal, content) {
  modal.style.display = 'block';

  const clickOutsideHandler = function(event) {
    if (event.target === modal) {
      modal.style.display = 'none';
      window.removeEventListener('click', clickOutsideHandler);
    }
  };
  window.addEventListener('click', clickOutsideHandler);
}

// OFFICIALS RENDERING
function renderOfficials(stateFilter = null, query = '') {
  showTab('my-officials');
  if (!officialsContainer) officialsContainer = document.getElementById('officials-container');
  if (!officialsContainer) return;
  officialsContainer.innerHTML = '';

  const stateAliases = {
    "Virgin Islands": "U.S. Virgin Islands",
    "Northern Mariana Islands": "Northern Mariana Islands",
    "Puerto Rico": "Puerto Rico"
  };
  stateFilter = stateAliases[stateFilter] || stateFilter;

  const queryLower = query.toLowerCase();
  const filterByState = query === '';

  const filteredGovs = governors.filter(o => !filterByState || o.state === stateFilter);
  const filteredLtGovs = ltGovernors.filter(o => !filterByState || o.state === stateFilter);
  const filteredSens = senators.filter(o => !filterByState || o.state === stateFilter);
  const filteredReps = houseReps
    .filter(o => !filterByState || o.state === stateFilter)
    .sort((a, b) => parseInt(a.district) - parseInt(b.district));

  const allOfficials = [
    ...federalOfficials,
    ...filteredGovs,
    ...filteredLtGovs,
    ...filteredSens,
    ...filteredReps
  ].filter(o =>
    (o.name || '').toLowerCase().includes(queryLower) ||
    (o.office || '').toLowerCase().includes(queryLower) ||
    (o.state || '').toLowerCase().includes(queryLower)
  );

  const partyMap = {
    republican: 'Republican',
    democrat: 'Democratic',
    democratic: 'Democratic',
    independent: 'Independent',
    green: 'Green',
    libertarian: 'Libertarian',
    constitution: 'Constitution',
    'working families': 'WorkingFamilies',
    workingfamilies: 'WorkingFamilies',
    progressive: 'Progressive'
  };

  const safeYear = d => {
    if (!d || (typeof d === 'string' && d.trim() === '')) return '';
    const dt = new Date(d);
    return isNaN(dt) ? '' : dt.getFullYear();
  };

  allOfficials.forEach(o => {
    const rawParty = (o.party || '').toLowerCase().trim();
    const normalizedParty = partyMap[rawParty] || rawParty.replace(/\s+/g, '') || 'Independent';
    const photoSrc = o.photo && o.photo.trim() !== '' ? o.photo : 'assets/default-photo.png';

    const districtDisplay = o.office === 'U.S. Representative' && o.district
      ? `<p class="district-display"><strong>District:</strong> ${o.district}</p>`
      : '';

    const startYear = safeYear(o.termStart);
    const endYear = safeYear(o.termEnd) || 'Present';
    const termDisplay = (startYear || endYear) ? `${startYear}–${endYear}` : 'Present';

    const card = document.createElement('div');
    card.className = 'official-card';
    card.setAttribute('data-party', normalizedParty);

    card.innerHTML = `
      <div class="party-stripe"></div>
      <div class="card-body">
        <div class="photo-wrapper">
          <img src="${photoSrc}" alt="${o.name}"
               onerror="this.onerror=null;this.src='assets/default-photo.png';" />
        </div>
        <div class="official-info">
          <h3>${o.name || 'Unknown'}</h3>
          <p><strong>Position:</strong> ${o.office || 'N/A'}</p>
          ${districtDisplay}
          <p><strong>State:</strong> ${o.state || 'United States'}</p>
          <p><strong>Term:</strong> ${termDisplay}</p>
          <p><strong>Party:</strong> ${o.party || 'N/A'}</p>
        </div>
      </div>
    `;
    card.addEventListener('click', () => openOfficialModal(o));
    officialsContainer.appendChild(card);
  });
}

// === SEARCH BAR WIRING ===
function wireSearchBar() {
  if (!searchBar) {
    searchBar = document.getElementById('search-bar');
  }
  if (!searchBar) return;

  searchBar.addEventListener('input', () => {
    const query = searchBar.value.trim();
    renderOfficials(null, query);
  });
}

// === STATE DROPDOWN WIRING ===
function wireStateDropdown() {
  const dropdown = document.getElementById('state-dropdown');
  if (!dropdown) return;

  dropdown.value = selectedState;

  dropdown.addEventListener('change', () => {
    selectedState = dropdown.value;
    window.selectedState = selectedState;
    renderOfficials(selectedState, '');
  });
}

// === DOM READY: load datasets and wire UI ===
document.addEventListener('DOMContentLoaded', () => {
  // Elements
  officialsContainer = document.getElementById('officials-container');
  searchBar = document.getElementById('search-bar');

  // Officials modal refs (match your HTML ids)
  officialsModal = document.getElementById('officials-modal');
  officialsModalContent = document.getElementById('officials-content');
  officialsModalCloseBtn = document.getElementById('officials-close');

  // Modal wiring (safe)
  if (officialsModalCloseBtn) {
    officialsModalCloseBtn.addEventListener('click', () => closeModalWindow('officials-modal'));
  }
  // Avoid global window.onclick overrides here; handled per modal open.

  // Core wiring
  wireSearchBar();
  wireStateDropdown();

  // Load officials data
  Promise.all([
    fetch('/governors.json').then(res => res.json()),
    fetch('/ltgovernors.json').then(res => res.json()),
    fetch('/senators.json').then(res => res.json()),
    fetch('/housereps.json').then(res => res.json())
  ])
    .then(([govs, ltGovs, sens, reps]) => {
      governors = govs;
      ltGovernors = ltGovs;
      senators = sens;
      houseReps = reps;
      renderOfficials(selectedState, '');
    })
    .catch(err => {
      console.error('Error loading official data:', err);
    });

  // Helper: clear the Officials search bar (no tab switch, no re-render)
  function closeOfficialsSearch() {
    if (!searchBar) return;
    searchBar.value = '';
    searchBar.blur();
  }

  // Click-outside to clear search
  document.addEventListener('mousedown', event => {
    if (!searchBar) return;
    if (event.target !== searchBar && !searchBar.contains(event.target)) {
      closeOfficialsSearch();
    }
  });
});
