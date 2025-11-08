// === GLOBAL STATE ===
let selectedState = 'North Carolina';
let governors = [], ltGovernors = [], senators = [], houseReps = [], cabinet = [];
let federalOfficials = [];
let officialsContainer = null, searchBar = null;

// === STATE ALIASES ===
const stateAliases = { "Virgin Islands": "U.S. Virgin Islands" };

// === POLL CATEGORIES (FULL) ===
const pollCategories = [
  {
    label: 'President',
    polls: [
      { source: 'Ballotpedia', name: 'Presidential approval index', url: 'https://ballotpedia.org/Ballotpedia%27s_Polling_Index:_Presidential_approval_rating' },
      { source: 'RCP', name: 'Presidential job approval', url: 'https://www.realclearpolling.com/polls/approval/donald-trump/approval-rating' },
      { source: '270toWin', name: '2028 GOP primary', url: 'https://www.270towin.com/2028-republican-nomination/' },
      { source: '270toWin', name: '2028 Dem primary', url: 'https://www.270towin.com/2028-democratic-nomination/' },
      { source: 'Cook Political', name: 'Presidential coverage', url: 'https://www.cookpolitical.com/' },
      { source: 'Sabato', name: 'Crystal Ball', url: 'https://centerforpolitics.org/crystalball/' },
      { source: 'AP-NORC', name: 'Polling tracker', url: 'https://apnews.com/projects/polling-tracker/' },
      { source: 'DDHQ', name: 'Polls averages', url: 'https://decisiondeskhq.com/polls/averages/' },
      { source: 'Gallup', name: 'Presidential approval', url: 'https://news.gallup.com/topic/presidential-job-approval.aspx' },
      { source: 'UCSB', name: 'Historical data', url: 'https://www.presidency.ucsb.edu/statistics/data/presidential-job-approval-all-data' }
    ]
  },
  {
    label: 'Vice President',
    polls: [
      { source: 'RCP', name: 'JD Vance favorability', url: 'https://www.realclearpolling.com/polls/favorability/j-d-vance' },
      { source: 'DDHQ', name: 'Polls averages', url: 'https://decisiondeskhq.com/polls/averages/' },
      { source: 'Ballotpedia', name: 'VP candidates', url: 'https://ballotpedia.org/Vice_presidential_candidates,_2024' },
      { source: 'Cook Political', name: 'VP coverage', url: 'https://www.cookpolitical.com/' },
      { source: 'Sabato', name: 'Crystal Ball', url: 'https://centerforpolitics.org/crystalball/' }
    ]
  },
  {
    label: 'Governor',
    polls: [
      { source: 'Ballotpedia', name: '2025 elections', url: 'https://ballotpedia.org/Gubernatorial_elections,_2025' },
      { source: 'RCP', name: 'Governor polls', url: 'https://www.realclearpolling.com/latest-polls/governor' },
      { source: '270toWin', name: '2026 polls', url: 'https://www.270towin.com/polls/latest-2026-governor-election-polls/' },
      { source: 'Cook Political', name: 'Ratings', url: 'https://www.cookpolitical.com/ratings/governor-race-ratings' },
      { source: 'Sabato', name: '2026 elections', url: 'https://centerforpolitics.org/crystalball/2026-governor/' }
    ]
  },
  {
    label: 'U.S. Senate',
    polls: [
      { source: 'Ballotpedia', name: '2026 elections', url: 'https://ballotpedia.org/United_States_Senate_elections,_2026' },
      { source: 'RCP', name: 'Latest polls', url: 'https://www.realclearpolling.com/latest-polls/senate' },
      { source: '270toWin', name: '2026 polls', url: 'https://www.270towin.com/polls/latest-2026-senate-election-polls/' },
      { source: 'Cook Political', name: 'Ratings', url: 'https://www.cookpolitical.com/ratings/senate-race-ratings' },
      { source: 'Sabato', name: '2026 Senate', url: 'https://centerforpolitics.org/crystalball/2026-senate/' }
    ]
  },
  {
    label: 'U.S. House',
    polls: [
      { source: 'Ballotpedia', name: '2026 elections', url: 'https://ballotpedia.org/United_States_House_of_Representatives_elections,_2026' },
      { source: 'RCP', name: 'Generic ballot', url: 'https://www.realclearpolling.com/polls/state-of-the-union/generic-congressional-vote' },
      { source: '270toWin', name: '2026 polls', url: 'https://www.270towin.com/polls/latest-2026-house-election-polls/' },
      { source: 'Cook Political', name: 'Ratings', url: 'https://www.cookpolitical.com/ratings/house-race-ratings' },
      { source: 'Sabato', name: '2026 House', url: 'https://centerforpolitics.org/crystalball/2026-house/' }
    ]
  }
];

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
    .then(r => r.ok ? r.json() : Promise.reject('voting-data.json not found'))
    .then(data => {
      container.innerHTML = '';
      let state = selectedState;
      if (state in stateAliases) state = stateAliases[state];
      const info = data[state];

      if (!info || Object.keys(info).length === 0) {
        container.innerHTML = `<p>No voting data available for ${state}.</p>`;
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
            <div class="card-label">${labels[key] || key.charAt(0).toUpperCase() + key.slice(1)}</div>
            ${description ? `<div class="card-description">${description}</div>` : ''}
            ${deadline ? `<div class="card-date">${deadline}</div>` : ''}
          </a>
        `;
        container.appendChild(card);
      });
    })
    .catch(err => {
      container.innerHTML = '<p>Error loading voting data.</p>';
      console.error('Voting fetch error:', err);
    });
}

// === POLLS TAB ===
function showPolls() {
  showTab('polls');
  const container = document.getElementById('polls-cards');
  if (!container) return;
  container.innerHTML = '';

  pollCategories.forEach(cat => {
    const section = document.createElement('div');
    section.innerHTML = `<h3>${cat.label}</h3>`;
    const grid = document.createElement('div');
    grid.className = 'poll-grid';

    cat.polls.forEach(p => {
      const card = document.createElement('div');
      card.className = 'poll-card';
      card.innerHTML = `
        <div class="poll-logo">
          <img src="assets/logos/${p.source.toLowerCase().replace(/[^a-z]/g, '')}.png" 
               alt="${p.source}" onerror="this.style.display='none'">
        </div>
        <p><strong>${p.source}</strong><br><small>${p.name}</small></p>
        <div class="poll-links"><a href="${p.url}" target="_blank">View →</a></div>
      `;
      grid.appendChild(card);
    });

    section.appendChild(grid);
    container.appendChild(section);
  });
}

// === CIVIC INTELLIGENCE TAB (Placeholder) ===
function showCivic() {
  showTab('civic');
  const container = document.getElementById('calendar');
  if (!container) return;
  container.innerHTML = `
    <h2>Civic Intelligence Dashboard</h2>
    <p>Coming soon: Election calendar, bill tracker, civic engagement tools, and more.</p>
    <div style="margin-top: 2rem; padding: 1rem; background: #f0f4f8; border-radius: 8px;">
      <strong>Upcoming Elections:</strong><br>
      • 2026 Midterm Elections<br>
      • 2028 Presidential Election
    </div>
  `;
}

// === ORGANIZATIONS TAB (Placeholder) ===
function showOrganizations() {
  showTab('organizations');
  // Will be expanded later
}

// === MODAL HELPERS ===
function closeModalWindow(id) {
  const modal = document.getElementById(id);
  if (modal) modal.style.display = 'none';
}

function openOfficialModal(official) {
  const modal = document.getElementById('officials-modal');
  const content = modal?.querySelector('.modal-content');
  if (!modal || !content) return;

  const photo = official.photo?.trim() ? official.photo : 'assets/default-photo.png';
  const year = d => d && !isNaN(new Date(d).getTime()) ? new Date(d).getFullYear() : '';
  const term = `${year(official.termStart)}–${year(official.termEnd) || 'Present'}`.replace(/^–|–$/g, 'Present');

  content.innerHTML = `
    <span class="close" onclick="closeModalWindow('officials-modal')">&times;</span>
    <div class="modal-card">
      <div class="modal-photo">
        <img src="${photo}" alt="${official.name}" onerror="this.src='assets/default-photo.png'">
      </div>
      <div class="modal-info">
        <h2>${official.name || 'Unknown'}</h2>
        <p><strong>Office:</strong> ${official.office || 'N/A'}</p>
        ${official.district ? `<p><strong>District:</strong> ${official.district}</p>` : ''}
        <p><strong>State:</strong> ${official.state || 'United States'}</p>
        <p><strong>Party:</strong> ${official.party || 'N/A'}</p>
        <p><strong>Term:</strong> ${term}</p>
        ${official.bio ? `<p><strong>Bio:</strong> ${official.bio}</p>` : ''}
        ${official.education ? `<p><strong>Education:</strong> ${official.education}</p>` : ''}
        ${official.platform ? `<p><strong>Platform:</strong> ${official.platform}</p>` : ''}
        ${official.platformFollowThrough ? `
          <div>
            <h3>Platform Follow-Through</h3>
            <ul>
              ${Object.entries(official.platformFollowThrough)
                .map(([k, v]) => `<li><strong>${k}:</strong> ${v}</li>`)
                .join('')}
            </ul>
          </div>
        ` : ''}
        ${official.website ? `<p><a href="${official.website}" target="_blank">Official Website</a></p>` : ''}
        ${official.ballotpediaLink ? `<p><a href="${official.ballotpediaLink}" target="_blank">Ballotpedia</a></p>` : ''}
      </div>
    </div>
  `;

  modal.style.display = 'block';
  modal.onclick = e => e.target === modal && closeModalWindow('officials-modal');
}
// === RENDER OFFICIALS ===
function renderOfficials(stateFilter = null, query = '') {
  showTab('my-officials');
  if (!officialsContainer) officialsContainer = document.getElementById('officials-container');
  if (!officialsContainer) return;
  officialsContainer.innerHTML = '';

  const q = query.toLowerCase();
  const byState = !query;
  const filterState = stateFilter ? (stateAliases[stateFilter] || stateFilter) : null;

  const allOfficials = [
    ...federalOfficials,
    ...governors.filter(o => !byState || o.state === filterState),
    ...ltGovernors.filter(o => !byState || o.state === filterState),
    ...senators.filter(o => !byState || o.state === filterState),
    ...houseReps.filter(o => !byState || o.state === filterState).sort((a, b) => +a.district - +b.district)
  ].filter(o =>
    !q || 
    o.name?.toLowerCase().includes(q) ||
    o.office?.toLowerCase().includes(q) ||
    o.state?.toLowerCase().includes(q)
  );

  const partyMap = { republican: 'Republican', democrat: 'Democratic', democratic: 'Democratic', independent: 'Independent' };
  const year = d => d && !isNaN(new Date(d).getTime()) ? new Date(d).getFullYear() : '';

  allOfficials.forEach(o => {
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
          <h3>${o.name || 'Unknown'}</h3>
          <p><strong>Position:</strong> ${o.office || 'N/A'}</p>
          ${o.district ? `<p><strong>District:</strong> ${o.district}</p>` : ''}
          <p><strong>State:</strong> ${o.state || 'United States'}</p>
          <p><strong>Term:</strong> ${term}</p>
          <p><strong>Party:</strong> ${o.party || 'N/A'}</p>
        </div>
      </div>
    `;
    card.onclick = () => openOfficialModal(o);
    officialsContainer.appendChild(card);
  });
}

// === SEARCH & STATE CONTROLS ===
function wireSearchBar() {
  if (!searchBar) searchBar = document.getElementById('search-bar');
  searchBar?.addEventListener('input', () => {
    renderOfficials(selectedState, searchBar.value.trim());
  });
}

function wireStateDropdown() {
  const dropdown = document.getElementById('state-dropdown');
  if (!dropdown) return;
  dropdown.value = selectedState;
  dropdown.onchange = () => {
    selectedState = dropdown.value;
    renderOfficials(selectedState, '');
    if (document.getElementById('voting').style.display === 'block') showVoting();
  };
}

// === DOM READY ===
document.addEventListener('DOMContentLoaded', () => {
  officialsContainer = document.getElementById('officials-container');
  searchBar = document.getElementById('search-bar');

  // Close modals
  document.querySelectorAll('.close').forEach(el => {
    el.onclick = () => closeModalWindow(el.closest('.modal').id);
  });

  wireSearchBar();
  wireStateDropdown();

  // Load all JSON data
  Promise.all([
    fetch('cabinet.json').then(r => r.ok ? r.json() : []),
    fetch('governors.json').then(r => r.ok ? r.json() : []),
    fetch('ltgovernors.json').then(r => r.ok ? r.json() : []),
    fetch('senators.json').then(r => r.ok ? r.json() : []),
    fetch('housereps.json').then(r => r.ok ? r.json() : [])
  ])
  .then(([cab, govs, ltg, sens, reps]) => {
    cabinet = cab;
    governors = govs;
    ltGovernors = ltg;
    senators = sens;
    houseReps = reps;

    // Federal Officials: President, VP, Cabinet
    federalOfficials = [
      {
        name: "Donald Trump",
        office: "President",
        party: "Republican",
        state: "United States",
        termStart: "2025-01-20",
        termEnd: "2029-01-20",
        photo: "assets/trump.jpg",
        bio: "47th President of the United States.",
        website: "https://www.whitehouse.gov",
        ballotpediaLink: "https://ballotpedia.org/Donald_Trump"
      },
      {
        name: "JD Vance",
        office: "Vice President",
        party: "Republican",
        state: "United States",
        termStart: "2025-01-20",
        termEnd: "2029-01-20",
        photo: "assets/vance.jpg",
        bio: "50th Vice President of the United States.",
        website: "https://www.whitehouse.gov/administration/jd-vance/",
        ballotpediaLink: "https://ballotpedia.org/J.D._Vance"
      },
      ...cabinet
    ];

    renderOfficials(selectedState, '');
  })
  .catch(err => {
    console.error('Failed to load official data:', err);
    document.getElementById('officials-container').innerHTML = '<p>Error loading officials.</p>';
  });
});
