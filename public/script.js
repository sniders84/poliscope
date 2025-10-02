// script.js for Poliscope - Fully rebuilt with all tweaks, no placeholders, no duplicates
let currentState = 'Alabama';
let officials = {
  governors: [], // Loaded from JSON
  senators: [], // Ready for future data
  representatives: [], // Ready for future data
  ltGovernors: [] // Ready for future data
};

// Load governors.json (no fallback - if fails, console error)
fetch('governors.json')
  .then(response => {
    if (!response.ok) throw new Error('JSON load failed');
    return response.json();
  })
  .then(data => {
    officials.governors = data.filter((g, index, self) => self.findIndex(t => t.state === g.state) === index); // Remove any duplicates by state
    populateStateSelect();
    window.showTab('my-officials');
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

// Tab switching
window.showTab = function(tabName) {
  document.querySelectorAll('section').forEach(section => section.style.display = 'none');
  let actualId = tabName;
  if (tabName === 'polls') actualId = 'compare'; // HTML mismatch for polls tab
  const target = document.getElementById(actualId);
  if (target) target.style.display = 'block';
  if (tabName === 'my-officials') renderMyOfficials(currentState);
  if (tabName === 'rankings') renderRankings('governors');
  if (tabName === 'polls') renderPolls();
  if (tabName === 'calendar') renderCalendar(currentState);
  if (tabName === 'registration') renderRegistration(currentState);
};

// State switcher - no redirect
document.getElementById('state-select').addEventListener('change', (e) => {
  currentState = e.target.value || 'Alabama';
  const activeTab = document.querySelector('section[style="display: block;"]')?.id;
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
    card.className = 'card';
    card.innerHTML = `
      <img src="${gov.photo}" alt="${gov.name}" style="width: 100px; height: auto;">
      <h3>${gov.name} (${gov.party})</h3>
      <p>${gov.bio}</p>
      <p>Approval: ${gov.approval}% (Rank: ${gov.rank})</p>
      <a href="${gov.pollSource}" target="_blank">Poll Source</a>
      <ul>Platforms: ${gov.platforms.map(p => `<li>${p}</li>`).join('')}</ul>
      <p>Follow Through: ${gov.follow_through}</p>
      <ul>Bills Signed: ${gov.bills_signed.map(b => `<li>${b.name} (${b.year}): ${b.description}</li>`).join('')}</ul>
    `;
    container.appendChild(card);
  }
  document.getElementById('polls-container').innerHTML = ''; // No stray cards
}

// Rankings (governors)
function renderRankings(type) {
  const container = document.getElementById('rankings-governors');
  if (!container) return;
  container.innerHTML = '';
  const sorted = [...officials.governors].sort((a, b) => {
    if (a.approval === b.approval) return b.tiebreaker - a.tiebreaker;
    return b.approval - a.approval;
  });
  const top10 = sorted.slice(0, 10);
  const bottom10 = sorted.slice(-10).reverse();
  top10.forEach((gov) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.height = '25%';
    card.style.padding = '5px';
    card.style.backgroundColor = '#CCFFCC';
    card.style.borderLeft = '5px solid green';
    card.innerHTML = `${gov.name} (${gov.state}, ${gov.party}) - ${gov.approval}%`;
    container.appendChild(card);
  });
  bottom10.forEach((gov) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.height = '25%';
    card.style.padding = '5px';
    card.style.backgroundColor = '#FFCCCC';
    card.style.borderLeft = '5px solid red';
    card.innerHTML = `${gov.name} (${gov.state}, ${gov.party}) - ${gov.approval}%`;
    container.appendChild(card);
  });
  // Middle gray for any in between, but per tweak, only top/bottom 10 populated
  // No overall text or section
  document.getElementById('top10-overall').innerHTML = '';
  // Empty other rankings
  ['senators', 'house', 'ltgovernors'].forEach(id => {
    document.getElementById(`rankings-${id}`).innerHTML = '';
  });
}

// Calendar
function renderCalendar(state) {
  const container = document.getElementById('calendar-container');
  if (!container) return;
  container.innerHTML = '';
  const events = electionData[state] || [];
  events.forEach(event => {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.backgroundColor = event.type.includes('Primary') ? '#FFFF99' : '#99CCFF';
    card.innerHTML = `<a href="${event.link}" target="_blank">${event.date} - ${event.type}</a>`;
    container.appendChild(card);
  });
}

// Registration
function renderRegistration(state) {
  const container = document.getElementById('voting-container');
  if (!container) return;
  container.innerHTML = '';
  const links = registrationLinks[state] || {};
  for (const key in links) {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `<a href="${links[key]}" target="_blank">${key.charAt(0).toUpperCase() + key.slice(1)}</a>`;
    container.appendChild(card);
  }
}

// Polls
function renderPolls() {
  const container = document.getElementById('compare-container');
  if (!container) return;
  container.innerHTML = '';
  const pollsData = [
    { name: 'RealClearPolling Presidential', link: 'https://www.realclearpolling.com/presidential', logo: 'https://www.realclearpolling.com/favicon.ico' },
    { name: 'RealClearPolling Senate', link: 'https://www.realclearpolling.com/senate-polls', logo: 'https://www.realclearpolling.com/favicon.ico' },
    { name: 'RealClearPolling Gubernatorial', link: 'https://www.realclearpolling.com/gubernatorial-polls', logo: 'https://www.realclearpolling.com/favicon.ico' },
    { name: 'Emerson College National', link: 'https://emersoncollegepolling.com/national-polls', logo: 'https://emersoncollegepolling.com/favicon.ico' },
    { name: 'Emerson College State', link: 'https://emersoncollegepolling.com/state-polls', logo: 'https://emersoncollegepolling.com/favicon.ico' },
    { name: 'FiveThirtyEight Polls', link: 'https://projects.fivethirtyeight.com/polls/', logo: 'https://projects.fivethirtyeight.com/favicon.ico' }
  ];
  pollsData.forEach(poll => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `<a href="${poll.link}" target="_blank"><img src="${poll.logo}" style="width: 50px;"><br>${poll.name}</a>`;
    container.appendChild(card);
  });
}

// Search
document.getElementById('search').addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase();
  if (query.length < 1) return;
  const suggestions = officials.governors.filter(g => g.name.toLowerCase().includes(query) || g.state.toLowerCase().includes(query) || g.party.toLowerCase().includes(query));
  const dropdown = document.getElementById('search-dropdown') || document.createElement('div');
  dropdown.id = 'search-dropdown';
  dropdown.style.position = 'absolute';
  dropdown.style.background = 'white';
  dropdown.style.border = '1px solid #ccc';
  dropdown.innerHTML = suggestions.map(g => `<div style="padding: 5px; cursor: pointer;" onclick="selectSearch('${g.state}')">${g.name} (${g.state}, ${g.party})</div>`).join('');
  e.target.parentNode.appendChild(dropdown);
});

document.getElementById('search').addEventListener('blur', () => {
  setTimeout(() => document.getElementById('search-dropdown')?.remove(), 100);
});

function selectSearch(state) {
  currentState = state;
  document.getElementById('state-select').value = state;
  renderMyOfficials(state);
  window.showTab('my-officials');
  document.getElementById('search').value = '';
}