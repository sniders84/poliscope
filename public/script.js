// === GLOBAL STATE ===
let selectedState = 'North Carolina';
let governors = [], ltGovernors = [], senators = [], houseReps = [], cabinet = [];
let federalOfficials = [];
let officialsContainer = null, searchBar = null;

// === POLL CATEGORIES ===
const pollCategories = [ /* ... same as before, full list ... */ ];
// (I'll paste full in Part 2)

// === STATE ALIASES ===
const stateAliases = { "Virgin Islands": "U.S. Virgin Islands" };

// === TAB SWITCHER ===
function showTab(id) {
  document.querySelectorAll('.tab-content').forEach(tab => tab.style.display = 'none');
  const el = document.getElementById(id);
  if (el) el.style.display = 'block';
  document.querySelectorAll('.tabs button').forEach(b => b.classList.remove('active'));
  document.querySelector(`.tabs button[onclick="showTab('${id}')"]`)?.classList.add('active');
}

// === VOTING TAB ===
function showVoting() {
  showTab('voting');
  const container = document.getElementById('voting-cards');
  if (!container) return;
  container.innerHTML = '<p>Loading voting information...</p>';

  fetch('voting-data.json')
    .then(r => r.ok ? r.json() : Promise.reject())
    .then(data => {
      container.innerHTML = '';
      let state = selectedState;
      if (state in stateAliases) state = stateAliases[state];
      const info = data[state];

      if (!info || Object.keys(info).length === 0) {
        container.innerHTML = `<p>No voting data for ${state}.</p>`;
        return;
      }

      const labels = {
        register: 'Register to Vote',
        id: 'Voter ID Requirements',
        absentee: 'Absentee Voting',
        early: 'Early Voting',
        polling: 'Find Your Polling Place',
        sample: 'View Sample Ballot',
        military: 'Military & Overseas Voting',
        counties: 'County Election Contacts',
        tools: 'State Voting Tools'
      };

      Object.entries(info).forEach(([key, val]) => {
        if (!val) return;
        const { url, icon = 'Ballot', description = '', deadline = '' } = typeof val === 'string' ? { url: val } : val;
        if (!url) return;

        const card = document.createElement('div');
        card.className = 'voting-card';
        card.innerHTML = `
          <a href="${url}" target="_blank">
            <div class="card-icon"><span class="emoji">${icon}</span></div>
            <div class="card-label">${labels[key] || key}</div>
            ${description ? `<div class="card-description">${description}</div>` : ''}
            ${deadline ? `<div class="card-date">${deadline}</div>` : ''}
          </a>
        `;
        container.appendChild(card);
      });
    })
    .catch(() => container.innerHTML = '<p>Error loading voting data.</p>');
}
