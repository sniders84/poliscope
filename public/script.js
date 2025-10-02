// script.js for Poliscope - Fixed version with all features
let officials = {
  governors: [
    // Fallback with your Kay Ivey template (full list loads from JSON if available)
    {
      name: 'Kay Ivey',
      state: 'Alabama',
      party: 'Republican',
      approval: 58,
      rank: 8,
      pollSource: 'https://newjerseyglobe.com/wp-content/uploads/2025/04/Governor-Approval-Outlook-April-2025.pdf',
      tiebreaker: 5000000,
      photo: 'https://ballotpedia.org/images/thumb/5/5f/Kay_Ivey.png/250px-Kay_Ivey.png',
      bio: 'Kay Ivey, born October 15, 1944, has been Alabama’s governor since 2017, previously serving as lieutenant governor and state treasurer. She focuses on economic development, education, and conservative values.',
      platforms: [
        'Promote economic growth and job creation.',
        'Strengthen education and workforce development.',
        'Support Second Amendment rights.',
        'Enhance infrastructure and broadband access.',
        'Uphold conservative social policies.'
      ],
      follow_through: 'Ivey has delivered on ~60% of her campaign promises, including tax cuts and job growth initiatives, but faced criticism on prison reform progress.',
      bills_signed: [
        { name: 'Curbside Voting Ban', year: 2021, description: 'Prohibited curbside voting to enhance election integrity.' },
        { name: 'Medical Marijuana Legalization', year: 2021, description: 'Authorized medical cannabis for patients with qualifying conditions.' },
        { name: 'IVF Legal Protection', year: 2024, description: 'Ensured access to in-vitro fertilization post-court ruling.' }
      ]
    }
  ],
  senators: [], // Ready
  representatives: [], // Ready
  ltGovernors: [] // Ready
};

const states = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia',
  'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland',
  'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey',
  'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina',
  'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
];

let currentState = 'Alabama';

// Load governors.json (fallback if fails)
fetch('governors.json')
  .then(response => response.json())
  .then(data => {
    officials.governors = data;
    console.log('Loaded full governors data');
    renderMyOfficials(currentState);
    renderRankingsGovernors();
  })
  .catch(error => {
    console.warn('JSON fetch failed, using fallback:', error);
    renderMyOfficials(currentState);
    renderRankingsGovernors();
  });

// Populate state select with all 50 states
function populateStateSelect() {
  const select = document.getElementById('state-select');
  if (!select) return;
  select.innerHTML = '<option value="">Choose a state</option>';
  states.forEach(state => {
    const option = document.createElement('option');
    option.value = state;
    option.textContent = state;
    select.appendChild(option);
  });
}

// Tab switching
window.showTab = function(tabName) {
  document.querySelectorAll('section').forEach(section => section.style.display = 'none');
  const targetSection = document.getElementById(tabName);
  if (targetSection) targetSection.style.display = 'block';
  // Render content for active tab
  if (tabName === 'my-officials') renderMyOfficials(currentState);
  if (tabName === 'rankings') renderRankingsGovernors();
  if (tabName === 'polls' || tabName === 'compare') renderPolls();
  if (tabName === 'calendar') renderCalendar(currentState);
  if (tabName === 'registration') renderRegistration(currentState);
};

// State switcher (no tab redirect)
document.getElementById('state-select').addEventListener('change', (e) => {
  currentState = e.target.value || 'Alabama';
  const activeTab = document.querySelector('section[style*="block"]')?.id;
  if (activeTab === 'my-officials') renderMyOfficials(currentState);
  if (activeTab === 'calendar') renderCalendar(currentState);
  if (activeTab === 'registration') renderRegistration(currentState);
});

// My Officials
function renderMyOfficials(state) {
  const container = document.getElementById('my-cards');
  if (!container) return;
  container.innerHTML = '';
  const gov = officials.governors.find(g => g.state === state);
  if (gov) {
    const card = document.createElement('div');
    card.className = 'card'; // Match your CSS
    card.innerHTML = `
      <img src="${gov.photo}" alt="${gov.name}" style="width: 100px;">
      <h3>${gov.name} (${gov.party})</h3>
      <p>Governor of ${state}</p>
      <p>${gov.bio}</p>
      <p>Approval: ${gov.approval}% (Rank: ${gov.rank})</p>
      <a href="${gov.pollSource}" target="_blank">Poll Source</a>
      <details><summary>Platforms</summary><ul>${gov.platforms?.map(p => `<li>${p}</li>`).join('') || ''}</ul></details>
      <details><summary>Follow Through</summary><p>${gov.follow_through || ''}</p></details>
      <details><summary>Bills Signed</summary><ul>${gov.bills_signed?.map(b => `<li>${b.name} (${b.year}): ${b.description}</li>`).join('') || ''}</ul></details>
    `;
    container.appendChild(card);
  }
  document.getElementById('polls-container').innerHTML = ''; // No extras
}

// Rankings - Governors
function renderRankingsGovernors() {
  const container = document.getElementById('rankings-governors');
  if (!container) return;
  container.innerHTML = '';
  const sorted = [...officials.governors].sort((a, b) => b.approval - a.approval || b.tiebreaker - a.tiebreaker);
  const top10 = sorted.slice(0, 10);
  const bottom10 = sorted.slice(-10).reverse();
  [...top10, ...bottom10].forEach((official, idx) => {
    const totalLen = officials.governors.length;
    const isTop = idx < 10;
    const isBottom = idx >= 10 && idx < 20;
    const card = document.createElement('div');
    card.className = 'card'; // Match CSS
    card.style.height = '25%';
    card.style.padding = '5px';
    card.style.margin = '2px';
    card.style.borderLeft = isTop ? '4px solid green' : isBottom ? '4px solid red' : '4px solid gray';
    card.style.backgroundColor = isTop ? '#CCFFCC' : isBottom ? '#FFCCCC' : '#CCCCCC';
    card.innerHTML = `<strong>${official.name}</strong> (${official.state}, ${official.party}) - ${official.approval}% (Rank: ${official.rank}) <a href="${official.pollSource}" target="_blank">[Source]</a>`;
    container.appendChild(card);
  });
  // Clear other rankings containers if empty
  ['senators', 'house', 'ltgovernors'].forEach(type => {
    const el = document.getElementById(`rankings-${type}`);
    if (el) el.innerHTML = '<p>No data yet.</p>';
  });
  document.getElementById('top10-overall').innerHTML = ''; // Deleted
}

// Calendar
const electionData = {
  Alabama: [{ date: 'March 3, 2025', type: 'Primary', link: 'https://www.sos.alabama.gov/elections' }, { date: 'November 4, 2025', type: 'General Election', link: 'https://www.sos.alabama.gov/elections' }],
  // Full data for all states (as in previous versions; add the rest here or from a separate file)
  // For brevity, assuming you add the full object
};

function renderCalendar(state) {
  const container = document.getElementById('calendar-container');
  if (!container) return;
  container.innerHTML = '';
  (electionData[state] || []).forEach(event => {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.backgroundColor = event.type.includes('Primary') ? '#FFFF99' : '#99CCFF';
    card.innerHTML = `<a href="${event.link}" target="_blank">${event.date} - ${event.type}</a>`;
    container.appendChild(card);
  });
}

// Registration
const registrationLinks = {
  Alabama: { register: 'https://www.sos.alabama.gov/alabama-votes/voter/register-to-vote', polling: 'https://myinfo.alabamavotes.gov/voterview', absentee: 'https://www.sos.alabama.gov/alabama-votes/voter/absentee-voting', volunteer: 'https://www.sos.alabama.gov/alabama-votes/poll-worker-information' },
  // Full data for all states (add the rest)
};

function renderRegistration(state) {
  const container = document.getElementById('voting-container');
  if (!container) return;
  const links = registrationLinks[state] || {};
  container.innerHTML = `
    <div class="card"><a href="${links.register}" target="_blank">Register to Vote</a></div>
    <div class="card"><a href="${links.polling}" target="_blank">Find Polling Places</a></div>
    <div class="card"><a href="${links.absentee}" target="_blank">Vote by Mail/Absentee</a></div>
    <div class="card"><a href="${links.volunteer}" target="_blank">Volunteer</a></div>
  `;
}

// Polls
function renderPolls() {
  const container = document.getElementById('compare-container');
  if (!container) return;
  container.innerHTML = '<h3>National Polls</h3>';
  const pollData = [
    { name: 'RealClearPolling - Presidential', link: 'https://www.realclearpolling.com/presidential', logo: 'https://www.realclearpolling.com/favicon.ico' },
    { name: 'RealClearPolling - Senate', link: 'https://www.realclearpolling.com/senate-polls', logo: 'https://www.realclearpolling.com/favicon.ico' },
    { name: 'RealClearPolling - Gubernatorial', link: 'https://www.realclearpolling.com/gubernatorial-polls', logo: 'https://www.realclearpolling.com/favicon.ico' },
    { name: 'Emerson College - National', link: 'https://emersoncollegepolling.com/national-polls', logo: 'https://emersoncollegepolling.com/favicon.ico' },
    { name: 'Emerson College - State', link: 'https://emersoncollegepolling.com/state-polls', logo: 'https://emersoncollegepolling.com/favicon.ico' },
    { name: 'FiveThirtyEight - Polls', link: 'https://projects.fivethirtyeight.com/polls/', logo: 'https://projects.fivethirtyeight.com/favicon.ico' },
    { name: 'Governor Approval Polls', link: 'https://newjerseyglobe.com/wp-content/uploads/2025/04/Governor-Approval-Outlook-April-2025.pdf', logo: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==' }
  ];
  pollData.forEach(poll => {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.padding = '10px';
    card.style.border = '1px solid #ccc';
    card.innerHTML = `<a href="${poll.link}" target="_blank"><img src="${poll.logo}" style="width: 50px;"><br>${poll.name}</a>`;
    container.appendChild(card);
  });
}

// Search
document.getElementById('search').addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase();
  if (query.length < 2) return;
  const allOfficials = [...officials.governors];
  const suggestions = allOfficials.filter(o => 
    o.name.toLowerCase().includes(query) ||
    o.state.toLowerCase().includes(query) ||
    o.party.toLowerCase().includes(query)
  );
  let dropdown = document.getElementById('search-dropdown');
  if (!dropdown) {
    dropdown = document.createElement('div');
    dropdown.id = 'search-dropdown';
    dropdown.style.position = 'absolute';
    dropdown.style.background = 'white';
    dropdown.style.border = '1px solid #ccc';
    dropdown.style.width = e.target.offsetWidth + 'px';
    dropdown.style.zIndex = '100';
    e.target.parentNode.appendChild(dropdown);
  }
  dropdown.innerHTML = suggestions.map(s => `<div class="suggestion" style="padding: 5px; cursor: pointer;" onclick="selectOfficial('${s.name}', '${s.state}')">${s.name} (${s.state}, ${s.party})</div>`).join('');
});

document.getElementById('search').addEventListener('blur', () => {
  setTimeout(() => {
    const dropdown = document.getElementById('search-dropdown');
    if (dropdown) dropdown.remove();
  }, 150);
});

function selectOfficial(name, state) {
  currentState = state;
  document.getElementById('state-select').value = state;
  renderMyOfficials(state);
  document.getElementById('search').value = name;
}

// Modal close
window.closeModal = function() {
  document.getElementById('modal-overlay').style.display = 'none';
};

// Init
document.addEventListener('DOMContentLoaded', () => {
  populateStateSelect();
  showTab('my-officials');
});