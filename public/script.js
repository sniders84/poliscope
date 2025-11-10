// === GLOBAL VARIABLES ===
let governors = [];
let ltGovernors = [];
let senators = [];
let houseReps = [];
let federalOfficials = []; // any preloaded federal officials
let selectedState = '';
let officialsContainer = null;
let searchBar = null;

// === SAFE LISTENER HELPER ===
function safeListen(selector, event, handler) {
  const el = document.querySelector(selector);
  if (el) el.addEventListener(event, handler);
}

// === DATE SAFETY HELPER ===
function safeYear(d) {
  if (!d || (typeof d === 'string' && d.trim() === '')) return '';
  const dt = new Date(d);
  return isNaN(dt) ? '' : dt.getFullYear();
}

// === PARTY NORMALIZER ===
const partyMap = {
  republican: 'republican',
  democrat: 'democrat',
  democratic: 'democrat',
  independent: 'independent',
  green: 'green',
  libertarian: 'libertarian',
  constitution: 'constitution',
  'working families': 'workingfamilies',
  workingfamilies: 'workingfamilies',
  progressive: 'progressive'
};
// === OFFICIALS RENDERING ===
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
  if (stateFilter && stateAliases[stateFilter]) stateFilter = stateAliases[stateFilter];

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

  allOfficials.forEach(o => {
    const rawParty = (o.party || '').toLowerCase().trim();
    const normalizedParty = partyMap[rawParty] || rawParty.replace(/\s+/g, '') || 'independent';
    const photoSrc = o.photo && o.photo.trim() !== '' ? o.photo : 'assets/default-photo.png';
    const districtDisplay = o.office === 'U.S. Representative' && o.district
      ? `<p class="district-display"><strong>District:</strong> ${o.district}</p>` : '';
    const startYear = safeYear(o.termStart);
    const endYear = safeYear(o.termEnd) || 'Present';
    const termDisplay = (startYear || endYear) ? `${startYear}–${endYear}` : 'Present';

    const card = document.createElement('div');
    card.className = `official-card ${normalizedParty}`;
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
// === OFFICIALS MODAL ===
function openOfficialModal(official) {
  const modal = document.getElementById('officials-modal');
  const modalContent = document.getElementById('officials-content');
  if (!modal || !modalContent) return;

  const { billsSigned, ...cleanOfficial } = official;
  const contact = cleanOfficial.contact || {};
  const photoSrc = cleanOfficial.photo && cleanOfficial.photo.trim() !== ''
    ? cleanOfficial.photo
    : 'assets/default-photo.png';
  const startYear = safeYear(cleanOfficial.termStart);
  const endYear = safeYear(cleanOfficial.termEnd) || 'Present';
  const termDisplay = (startYear || endYear) ? `${startYear}–${endYear}` : 'Present';

  modalContent.innerHTML = `
    <div class="modal-card">
      <div class="modal-photo">
        <img src="${photoSrc}" alt="${cleanOfficial.name || ''}"
             onerror="this.onerror=null;this.src='assets/default-photo.png';" />
      </div>
      <div class="modal-info">
        <h2>${cleanOfficial.name || 'Unknown'}</h2>
        <p><strong>Office:</strong> ${cleanOfficial.office || 'N/A'}</p>
        ${cleanOfficial.district ? `<p><strong>District:</strong> ${cleanOfficial.district}</p>` : ''}
        <p><strong>State:</strong> ${cleanOfficial.state || 'United States'}</p>
        <p><strong>Party:</strong> ${cleanOfficial.party || 'N/A'}</p>
        <p><strong>Term:</strong> ${termDisplay}</p>
        ${cleanOfficial.bio ? `<p>${cleanOfficial.bio}</p>` : ''}
        ${cleanOfficial.education ? `<p><strong>Education:</strong> ${cleanOfficial.education}</p>` : ''}
        ${cleanOfficial.platform ? `<p><strong>Platform:</strong> ${cleanOfficial.platform}</p>` : ''}
        ${cleanOfficial.platformFollowThrough
          ? `<div class="follow-through"><h3>Platform Follow-Through</h3><ul>${
              Object.entries(cleanOfficial.platformFollowThrough)
                .map(([topic, summary]) => `<li><strong>${topic}:</strong> ${summary}</li>`)
                .join('')
            }</ul></div>` : ''}
        ${cleanOfficial.proposals ? `<p><strong>Proposals:</strong> ${cleanOfficial.proposals}</p>` : ''}
        ${(cleanOfficial.vetoes && ['Governor', 'President'].includes(cleanOfficial.office))
          ? `<p><strong>Vetoes:</strong> ${cleanOfficial.vetoes}</p>` : ''}
        ${cleanOfficial.salary ? `<p><strong>Salary:</strong> ${cleanOfficial.salary}</p>` : ''}
        ${cleanOfficial.govtrackStats
          ? `<div class="govtrack-stats"><h3>Congressional Rankings</h3><ul>${
              Object.entries(cleanOfficial.govtrackStats)
                .map(([label, value]) => `<li><strong>${label.replace(/([A-Z])/g, ' $1')}:</strong> ${value}</li>`)
                .join('')
            }</ul></div>` : ''}
        ${cleanOfficial.website ? `<p><a href="${cleanOfficial.website}" target="_blank">Official Website</a></p>` : ''}
        ${contact.email ? `<p><strong>Email:</strong> ${contact.email}</p>` : ''}
        ${contact.phone ? `<p><strong>Phone:</strong> ${contact.phone}</p>` : ''}
        ${contact.website ? `<p><a href="${contact.website}" target="_blank">Contact Website</a></p>` : ''}
        ${cleanOfficial.ballotpediaLink ? `<p><a href="${cleanOfficial.ballotpediaLink}" target="_blank">Ballotpedia Profile</a></p>` : ''}
        ${cleanOfficial.govtrackLink ? `<p><a href="${cleanOfficial.govtrackLink}" target="_blank">GovTrack</a></p>` : ''}
      </div>
    </div>
  `;

  modal.style.display = 'block';

  const clickOutsideHandler = function(event) {
    if (event.target === modal) {
      modal.style.display = 'none';
      window.removeEventListener('click', clickOutsideHandler);
    }
  };
  window.addEventListener('click', clickOutsideHandler);
}

function closeModalWindow(id = 'officials-modal') {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = 'none';
}
// === SEARCH BAR WIRING ===
function wireSearchBar() {
  if (!searchBar) searchBar = document.getElementById('search-bar');
  if (!searchBar) return;

  searchBar.addEventListener('input', () => {
    const query = searchBar.value.trim();
    renderOfficials(selectedState, query);
  });

  // Close search if clicked outside
  document.addEventListener('mousedown', event => {
    if (!searchBar) return;
    if (event.target !== searchBar && !searchBar.contains(event.target)) {
      searchBar.value = '';
      searchBar.blur();
    }
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
// === TAB NAVIGATION ===
function showTab(tabId) {
  const tabs = document.querySelectorAll('.tab-content');
  tabs.forEach(tab => tab.style.display = 'none');

  const activeTab = document.getElementById(tabId);
  if (activeTab) activeTab.style.display = 'block';
}

// Example tab functions (replace with your own logic if needed)
function showStartupHub() { showTab('homehub'); }
function showCivic() { showTab('civic'); }
function showPolls() { showTab('polls'); }
function showOrganizations() { showTab('organizations'); }
function showVoting() { showTab('voting'); }
// === INITIALIZATION ON DOM CONTENT LOADED ===
document.addEventListener('DOMContentLoaded', () => {
  officialsContainer = document.getElementById('officials-container');
  searchBar = document.getElementById('search-bar');
  const loadingOverlay = document.getElementById('loading-overlay');

  const officialsModal = document.getElementById('officials-modal');
  const officialsModalCloseBtn = document.getElementById('officials-close');

  if (officialsModalCloseBtn) {
    officialsModalCloseBtn.addEventListener('click', () => closeModalWindow('officials-modal'));
  }

  wireSearchBar();
  wireStateDropdown();

  // === TAB BUTTON WIRING (SAFE) ===
  safeListen('#homehub-tab', 'click', showStartupHub);
  safeListen('#officials-tab', 'click', () => renderOfficials(selectedState, ''));
  safeListen('#civic-tab', 'click', showCivic);
  safeListen('#polls-tab', 'click', showPolls);
  safeListen('#organizations-tab', 'click', showOrganizations);
  safeListen('#voting-tab', 'click', showVoting);

  // === FETCH DATA ===
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

      if (loadingOverlay) {
        loadingOverlay.style.transition = 'opacity 0.5s ease';
        loadingOverlay.style.opacity = '0';
        setTimeout(() => loadingOverlay.remove(), 500);
      }

      // Load social trends if function exists
      if (typeof loadSocialTrends === 'function') {
        console.log("🎬 loadSocialTrends is running...");
        loadSocialTrends();
      }
    })
    .catch(err => {
      console.error('Error loading official data:', err);
      if (loadingOverlay) loadingOverlay.textContent = 'Failed to load data.';
    });
});
// === OPTIONAL HELPERS ===

// Smooth scroll to top
function scrollToTop(duration = 300) {
  const start = window.scrollY;
  const startTime = performance.now();

  function scrollStep(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    window.scrollTo(0, start * (1 - progress));
    if (progress < 1) requestAnimationFrame(scrollStep);
  }
  requestAnimationFrame(scrollStep);
}

// Toggle visibility utility
function toggleVisibility(selector) {
  const el = document.querySelector(selector);
  if (el) el.style.display = (el.style.display === 'none' || el.style.display === '') ? 'block' : 'none';
}
