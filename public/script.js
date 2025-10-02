// script.js for Poliscope - Updated with all features
let officials = {
  governors: [],
  senators: [], // Ready for data
  representatives: [], // Ready for data
  ltGovernors: [] // Ready for data
};

const states = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia',
  'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland',
  'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey',
  'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina',
  'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
  // Territories can be added if needed
];

// Load governors.json
fetch('governors.json')
  .then(response => response.json())
  .then(data => {
    officials.governors = data;
    populateStateSelect();
    renderMyOfficials('Alabama'); // Default
    renderRankingsGovernors();
  })
  .catch(error => console.error('Error loading governors.json:', error));

// Populate state select
function populateStateSelect() {
  const select = document.getElementById('state-select');
  select.innerHTML = '<option value="">Choose a state</option>';
  states.forEach(state => {
    const option = document.createElement('option');
    option.value = state;
    option.textContent = state;
    select.appendChild(option);
  });
}

// Tab switching (from cleanHouse.js or inline)
window.showTab = function(tabName) {
  const sections = document.querySelectorAll('section');
  sections.forEach(section => section.style.display = 'none');
  document.getElementById(tabName).style.display = 'block';
  if (tabName === 'rankings') renderRankingsGovernors();
  if (tabName === 'polls') renderPolls();
  if (tabName === 'calendar') renderCalendar(currentState || 'Alabama');
  if (tabName === 'registration') renderRegistration(currentState || 'Alabama');
};

// Track current state
let currentState = 'Alabama';

// State switcher
document.getElementById('state-select').addEventListener('change', (e) => {
  currentState = e.target.value || 'Alabama';
  const activeTab = document.querySelector('section[style*="block"]')?.id;
  if (activeTab === 'my-officials') renderMyOfficials(currentState);
  if (activeTab === 'calendar') renderCalendar(currentState);
  if (activeTab === 'registration') renderRegistration(currentState);
});

// My Officials Tab
function renderMyOfficials(state) {
  const container = document.getElementById('my-cards');
  if (!container) return;
  container.innerHTML = '';
  const gov = officials.governors.find(g => g.state === state);
  if (gov) {
    const card = document.createElement('div');
    card.className = 'official-card'; // Assume CSS class
    card.innerHTML = `
      <img src="${gov.photo}" alt="${gov.name}" style="width: 100px; height: auto;">
      <h3>${gov.name} (${gov.party})</h3>
      <p>Governor of ${state}</p>
      <p>${gov.bio || ''}</p>
      <p>Approval: ${gov.approval}% (Rank: ${gov.rank})</p>
      <a href="${gov.pollSource}" target="_blank">Poll Source</a>
      <details>
        <summary>Platforms</summary>
        <ul>${gov.platforms?.map(p => `<li>${p}</li>`).join('') || ''}</ul>
      </details>
      <details>
        <summary>Follow Through</summary>
        <p>${gov.follow_through || ''}</p>
      </details>
      <details>
        <summary>Bills Signed</summary>
        <ul>${gov.bills_signed?.map(b => `<li>${b.name} (${b.year}): ${b.description}</li>`).join('') || ''}</ul>
      </details>
    `;
    container.appendChild(card);
  }
  document.getElementById('polls-container').innerHTML = ''; // No stray polling cards
}

// Rankings Tab - Governors (example; extend for others)
function renderRankingsGovernors() {
  const container = document.getElementById('rankings-governors');
  if (!container) return;
  container.innerHTML = '';
  const sorted = [...officials.governors].sort((a, b) => {
    if (a.approval === b.approval) return b.tiebreaker - a.tiebreaker;
    return b.approval - a.approval;
  });
  const top10 = sorted.slice(0, 10);
  const bottom10 = sorted.slice(-10).reverse();
  [...top10, ...bottom10].forEach((official, index) => {
    const isTop = index < 10;
    const isBottom = index >= 10;
    const card = document.createElement('div');
    card.className = 'ranking-card';
    card.style.height = '25%';
    card.style.padding = '5px';
    card.style.backgroundColor = isTop ? '#CCFFCC' : isBottom ? '#FFCCCC' : '#CCCCCC';
    card.style.borderLeft = isTop ? '4px solid green' : isBottom ? '4px solid red' : '4px solid gray';
    card.innerHTML = `
      <strong>${official.name}</strong> (${official.state}, ${official.party}) - ${official.approval}% (Rank: ${official.rank})
      <a href="${official.pollSource}" target="_blank">Source</a>
    `;
    container.appendChild(card);
  });
  // Delete top 10 overall
  document.getElementById('top10-overall').innerHTML = '';
}

// Calendar Tab
const electionData = {
  // ... (full electionData from earlier script, truncated for brevity)
  Alabama: [{ date: 'March 3, 2025', type: 'Primary', link: 'https://www.sos.alabama.gov/elections' }, { date: 'November 4, 2025', type: 'General Election', link: 'https://www.sos.alabama.gov/elections' }]
  // Add all states as in previous
};

function renderCalendar(state) {
  const container = document.getElementById('calendar-container');
  if (!container) return;
  container.innerHTML = '';
  electionData[state]?.forEach(event => {
    const card = document.createElement('div');
    card.className = 'calendar-card';
    card.style.backgroundColor = event.type.includes('Primary') ? '#FFFF99' : '#99CCFF';
    card.innerHTML = `<a href="${event.link}" target="_blank">${event.date} - ${event.type}</a>`;
    container.appendChild(card);
  });
}

// Registration Tab
const registrationLinks = {
  // ... (full registrationLinks from earlier, truncated)
  Alabama: { register: 'https://www.sos.alabama.gov/alabama-votes/voter/register-to-vote', polling: 'https://myinfo.alabamavotes.gov/voterview', absentee: 'https://www.sos.alabama.gov/alabama-votes/voter/absentee-voting', volunteer: 'https://www.sos.alabama.gov/alabama-votes/poll-worker-information' }
  // Add all states
};

function renderRegistration(state) {
  const container = document.getElementById('voting-container');
  if (!container) return;
  const links = registrationLinks[state] || {};
  container.innerHTML = `
    <div class="reg-card"><a href="${links.register}" target="_blank">Register to Vote</a></div>
    <div class="reg-card"><a href="${links.polling}" target="_blank">Find Polling Places</a></div>
    <div class="reg-card"><a href="${links.absentee}" target="_blank">Vote by Mail/Absentee</a></div>
    <div class="reg-card"><a href="${links.volunteer}" target="_blank">Volunteer as Poll Worker</a></div>
  `;
}

// Polls Tab
function renderPolls() {
  const container = document.getElementById('compare-container');
  if (!container) return;
  container.innerHTML = '<h3>National Polls Trackers</h3>';
  const pollData = [
    { name: 'RealClearPolling - Presidential', link: 'https://www.realclearpolling.com/presidential', logo: 'https://www.realclearpolling.com/favicon.ico' },
    { name: 'RealClearPolling - Senate', link: 'https://www.realclearpolling.com/senate-polls', logo: 'https://www.realclearpolling.com/favicon.ico' },
    { name: 'RealClearPolling - Gubernatorial', link: 'https://www.realclearpolling.com/gubernatorial-polls', logo: 'https://www.realclearpolling.com/favicon.ico' },
    { name: 'Emerson College - National', link: 'https://emersoncollegepolling.com/national-polls', logo: 'https://emersoncollegepolling.com/favicon.ico' },
    { name: 'Emerson College - State', link: 'https://emersoncollegepolling.com/state-polls', logo: 'https://emersoncollegepolling.com/favicon.ico' },
    { name: 'FiveThirtyEight - Polls', link: 'https://projects.fivethirtyeight.com/polls/', logo: 'https://projects.fivethirtyeight.com/favicon.ico' },
    { name: 'Governor Approval Polls (April 2025)', link: 'https://newjerseyglobe.com/wp-content/uploads/2025/04/Governor-Approval-Outlook-April-2025.pdf', logo: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==' } // Generic graph icon base64
  ];
  const grid = document.createElement('div');
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(200px, 1fr))';
  grid.style.gap = '10px';
  pollData.forEach(poll => {
    const card = document.createElement('div');
    card.className = 'poll-card';
    card.style.padding = '10px';
    card.style.border = '1px solid #ccc';
    card.style.textAlign = 'center';
    card.innerHTML = `<a href="${poll.link}" target="_blank"><img src="${poll.logo}" style="width: 50px; height: auto;"><br>${poll.name}</a>`;
    grid.appendChild(card);
  });
  container.appendChild(grid);
}

// Search Bar
document.getElementById('search').addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase();
  const allOfficials = [...officials.governors, ...officials.senators, ...officials.representatives, ...officials.ltGovernors];
  const suggestions = allOfficials.filter(o => 
    o.name.toLowerCase().includes(query) ||
    o.state.toLowerCase().includes(query) ||
    o.party.toLowerCase().includes(query)
  );
  // Assume a dropdown div below search; add to HTML if needed: <div id="search-dropdown"></div>
  const dropdown = document.getElementById('search-dropdown') || document.createElement('div'); // Create if missing
  dropdown.id = 'search-dropdown';
  dropdown.style.position = 'absolute';
  dropdown.style.background = 'white';
  dropdown.style.border = '1px solid #ccc';
  dropdown.innerHTML = suggestions.map(s => `<div class="suggestion" onclick="selectOfficial('${s.name}')">${s.name} (${s.state}, ${s.party})</div>`).join('');
  e.target.parentNode.appendChild(dropdown);
});

document.getElementById('search').addEventListener('blur', () => {
  setTimeout(() => {
    const dropdown = document.getElementById('search-dropdown');
    if (dropdown) dropdown.remove();
  }, 200);
});

function selectOfficial(name) {
  // Navigate to official or highlight
  document.getElementById('search').value = name;
  // Example: renderMyOfficials for matching state
}

// Modal (from your HTML)
function closeModal() {
  document.getElementById('modal-overlay').style.display = 'none';
}

// Initialize default tab
document.addEventListener('DOMContentLoaded', () => {
  showTab('my-officials');
});