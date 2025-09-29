window.showTab = function(id) {
  const sections = ['my-officials', 'compare', 'rankings', 'rookies', 'calendar', 'registration'];
  sections.forEach(sectionId => {
    const el = document.getElementById(sectionId);
    if (el) el.style.display = sectionId === id ? 'block' : 'none';
  });

  const results = document.getElementById('results');
  if (results) results.innerHTML = '';
  const search = document.getElementById('search');
  if (search) search.value = '';
};
document.querySelectorAll('.tab-button').forEach(button => {
  button.addEventListener('click', () => {
    const tabId = button.getAttribute('data-tab');
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    showTab(tabId);
  });
});
function renderMyOfficials(state) {
  const matches = window.allOfficials.filter(person => {
    const stateMatch =
      person.state === state ||
      person.stateName === state ||
      person.stateAbbreviation === state;

    const role = (person.office || person.position || "").toLowerCase();
    const isLtGovernor = role.includes("lt. governor") || role.includes("lieutenant governor");

    return stateMatch && !isLtGovernor;
  });

  console.log("Filtered My Officials:", matches.map(p => `${p.name} (${p.office})`));

  renderCards(matches, 'my-cards');

  document.querySelectorAll('#my-cards .card').forEach(card => {
    card.addEventListener('click', () => {
      const officialId = card.getAttribute('data-id');
      const official = window.allOfficials.find(p => p.id === officialId);
      if (official) openModal(official);
    });
  });
}
fetch('LtGovernors.json')
  .then(res => res.json())
  .then(data => {
    console.log(`✅ Loaded LtGovernors.json: ${data.length} entries`);
    renderLtGovernors(data);
  })
  .catch(err => console.error("❌ Failed to load LtGovernors.json:", err));
loadData();
const calendarEvents = [
  {
    title: "General Election",
    date: "2025-11-04",
    state: "Alabama",
    type: "Election",
    link: "https://www.vote411.org/upcoming/1/events",
    details: "Statewide general election including Governor and House seats."
  },
  // Add more events here
];
function renderCards(data, targetId) {
  const container = document.getElementById(targetId);
  if (!container) return;

  container.innerHTML = '';

  data.forEach(person => {
    const card = document.createElement('div');
    card.className = 'card';
    card.setAttribute('data-id', person.id);

    card.innerHTML = `
      <img src="${person.photo || 'placeholder.jpg'}" alt="${person.name}" />
      <h3>${person.name}</h3>
      <p>${person.office || person.position || ''}</p>
    `;

    container.appendChild(card);
  });
}
function openModal(person) {
  const modal = document.getElementById('modal');
  const content = modal.querySelector('.modal-content');

  content.innerHTML = `
    <h2>${person.name}</h2>
    <p><strong>Office:</strong> ${person.office || person.position || ''}</p>
    <p><strong>Party:</strong> ${person.party || 'Unknown'}</p>
    <p><strong>State:</strong> ${person.stateName || person.state || ''}</p>
    ${renderBills(person.bills)}
  `;

  modal.style.display = 'block';
}
function renderBills(bills) {
  if (!Array.isArray(bills) || bills.length === 0) return '<p><em>No bills available.</em></p>';

  const verified = bills.filter(b => b.link && b.link.includes('legiscan.com'));
  if (verified.length === 0) return '<p><em>No verified bills.</em></p>';

  return `
    <ul>
      ${verified.map(b => `<li><a href="${b.link}" target="_blank">${b.title}</a></li>`).join('')}
    </ul>
  `;
}
function loadData() {
  fetch('officials.json')
    .then(res => res.json())
    .then(data => {
      console.log(`✅ Loaded officials.json: ${data.length} entries`);
      window.allOfficials = data;
      renderMyOfficials('AL'); // default state
    })
    .catch(err => console.error("❌ Failed to load officials.json:", err));
}
document.getElementById('modal-close').addEventListener('click', () => {
  document.getElementById('modal').style.display = 'none';
});

window.addEventListener('click', event => {
  const modal = document.getElementById('modal');
  if (event.target === modal) modal.style.display = 'none';
});
function renderLtGovernors(data) {
  const container = document.getElementById('lt-governors');
  if (!container) return;

  container.innerHTML = '';

  data.forEach(person => {
    const card = document.createElement('div');
    card.className = 'card';
    card.setAttribute('data-id', person.id);

    card.innerHTML = `
      <img src="${person.photo || 'placeholder.jpg'}" alt="${person.name}" />
      <h3>${person.name}</h3>
      <p>${person.office || person.position || ''}</p>
    `;

    container.appendChild(card);
  });

  document.querySelectorAll('#lt-governors .card').forEach(card => {
    card.addEventListener('click', () => {
      const officialId = card.getAttribute('data-id');
      const official = data.find(p => p.id === officialId);
      if (official) openModal(official);
    });
  });
}
function renderCalendar(events) {
  const container = document.getElementById('calendar');
  if (!container) return;

  container.innerHTML = '';

  events.forEach(event => {
    const block = document.createElement('div');
    block.className = 'calendar-event';

    block.innerHTML = `
      <h4>${event.title}</h4>
      <p><strong>Date:</strong> ${event.date}</p>
      <p><strong>Type:</strong> ${event.type}</p>
      <p><strong>Details:</strong> ${event.details}</p>
      <a href="${event.link}" target="_blank">More Info</a>
    `;

    container.appendChild(block);
  });
}
function renderRegistration() {
  const container = document.getElementById('registration');
  if (!container) return;

  container.innerHTML = `
    <h3>Register to Vote in Alabama</h3>
    <p><strong>Deadline:</strong> October 21, 2025</p>
    <p><strong>Online Registration:</strong> <a href="https://www.sos.alabama.gov/alabama-votes/voter/register-to-vote" target="_blank">Click here</a></p>
    <p><strong>Mail-in Ballot Info:</strong> <a href="https://www.sos.alabama.gov/alabama-votes/voter/absentee-voting" target="_blank">Request absentee ballot</a></p>
    <p><strong>Step-by-step Instructions:</strong></p>
    <ol>
      <li>Check your registration status</li>
      <li>Submit your registration online or by mail</li>
      <li>Track your ballot and confirm receipt</li>
    </ol>
  `;
}
function renderRookies(data) {
  const container = document.getElementById('rookies');
  if (!container) return;

  const rookies = data.filter(person => person.isRookie === true);
  console.log(`🟢 Rookies found: ${rookies.length}`);

  renderCards(rookies, 'rookies');

  document.querySelectorAll('#rookies .card').forEach(card => {
    card.addEventListener('click', () => {
      const officialId = card.getAttribute('data-id');
      const official = data.find(p => p.id === officialId);
      if (official) openModal(official);
    });
  });
}
function renderRankings(data) {
  const container = document.getElementById('rankings');
  if (!container) return;

  container.innerHTML = '';

  const sorted = [...data].sort((a, b) => (b.engagementScore || 0) - (a.engagementScore || 0));

  sorted.forEach((person, index) => {
    const block = document.createElement('div');
    block.className = 'ranking-entry';

    block.innerHTML = `
      <span class="rank">${index + 1}</span>
      <img src="${person.photo || 'placeholder.jpg'}" alt="${person.name}" />
      <strong>${person.name}</strong>
      <p>${person.office || person.position || ''}</p>
      <p><strong>Score:</strong> ${person.engagementScore || 'N/A'}</p>
    `;

    container.appendChild(block);
  });
}
function renderComparison(data) {
  const container = document.getElementById('compare');
  if (!container) return;

  container.innerHTML = '';

  if (data.length < 2) {
    container.innerHTML = '<p><em>Select at least two officials to compare.</em></p>';
    return;
  }

  const table = document.createElement('table');
  table.className = 'comparison-table';

  const headers = ['Name', 'Office', 'Party', 'State', 'Engagement Score'];
  const headerRow = document.createElement('tr');
  headers.forEach(h => {
    const th = document.createElement('th');
    th.textContent = h;
    headerRow.appendChild(th);
  });
  table.appendChild(headerRow);

  data.forEach(person => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${person.name}</td>
      <td>${person.office || person.position || ''}</td>
      <td>${person.party || 'Unknown'}</td>
      <td>${person.stateName || person.state || ''}</td>
      <td>${person.engagementScore || 'N/A'}</td>
    `;
    table.appendChild(row);
  });

  container.appendChild(table);
}
function pinOfficial(id) {
  if (!window.pinnedOfficials) window.pinnedOfficials = [];
  if (!window.pinnedOfficials.includes(id)) {
    window.pinnedOfficials.push(id);
    console.log(`📌 Pinned: ${id}`);
  }
}
function renderPinned(data) {
  const container = document.getElementById('spotlight');
  if (!container || !window.pinnedOfficials) return;

  const pinned = data.filter(p => window.pinnedOfficials.includes(p.id));
  container.innerHTML = '';

  pinned.forEach(person => {
    const card = document.createElement('div');
    card.className = 'card';
    card.setAttribute('data-id', person.id);

    card.innerHTML = `
      <img src="${person.photo || 'placeholder.jpg'}" alt="${person.name}" />
      <h3>${person.name}</h3>
      <p>${person.office || person.position || ''}</p>
    `;

    container.appendChild(card);
  });
}
function renderSpotlight(data) {
  const container = document.getElementById('spotlight');
  if (!container || !window.pinnedOfficials) return;

  const spotlighted = data.filter(p => window.pinnedOfficials.includes(p.id));
  container.innerHTML = '';

  spotlighted.forEach(person => {
    const card = document.createElement('div');
    card.className = 'card';
    card.setAttribute('data-id', person.id);

    card.innerHTML = `
      <img src="${person.photo || 'placeholder.jpg'}" alt="${person.name}" />
      <h3>${person.name}</h3>
      <p>${person.office || person.position || ''}</p>
    `;

    container.appendChild(card);
  });

  document.querySelectorAll('#spotlight .card').forEach(card => {
    card.addEventListener('click', () => {
      const officialId = card.getAttribute('data-id');
      const official = data.find(p => p.id === officialId);
      if (official) openModal(official);
    });
  });
}
function renderPartyIcon(party) {
  const normalized = (party || '').toLowerCase();
  if (normalized.includes('democrat')) return '🟦';
  if (normalized.includes('republican')) return '🟥';
  if (normalized.includes('independent')) return '⬜';
  return '❔';
}
function renderSearchBar() {
  const input = document.getElementById('search');
  const results = document.getElementById('results');

  input.addEventListener('input', () => {
    const query = input.value.toLowerCase();
    if (!query || !window.allOfficials) {
      results.innerHTML = '';
      return;
    }

    const matches = window.allOfficials.filter(person => {
      return (
        person.name.toLowerCase().includes(query) ||
        (person.office || '').toLowerCase().includes(query) ||
        (person.state || '').toLowerCase().includes(query)
      );
    });

    results.innerHTML = '';
    matches.forEach(person => {
      const item = document.createElement('div');
      item.className = 'search-result';
      item.textContent = `${person.name} (${person.office || ''})`;
      item.addEventListener('click', () => openModal(person));
      results.appendChild(item);
    });
  });
}
function initUI() {
  renderSearchBar();
  renderStateDropdown([
    { name: 'Alabama', abbreviation: 'AL' },
    { name: 'North Carolina', abbreviation: 'NC' },
    // Add more states as needed
  ]);
  renderRegistration();
  renderCalendar(calendarEvents);
}
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  initUI();
  showTab('my-officials'); // default tab
});
function renderIcons(person) {
  const partyIcon = renderPartyIcon(person.party);
  const rookieBadge = person.isRookie ? '🟢 Rookie' : '';
  const pinned = window.pinnedOfficials?.includes(person.id) ? '📌 Pinned' : '';

  return `
    <div class="icon-row">
      <span>${partyIcon}</span>
      <span>${rookieBadge}</span>
      <span>${pinned}</span>
    </div>
  `;
}
function renderModalFooter(person) {
  return `
    <div class="modal-footer">
      <button onclick="pinOfficial('${person.id}')">📌 Pin</button>
      <button onclick="addToComparison('${person.id}')">🔍 Compare</button>
    </div>
  `;
}
function addToComparison(id) {
  if (!window.compareList) window.compareList = [];
  if (!window.compareList.includes(id)) {
    window.compareList.push(id);
    console.log(`🔍 Added to comparison: ${id}`);
  }

  const officials = window.allOfficials.filter(p => window.compareList.includes(p.id));
  renderComparison(officials);
}
function clearComparison() {
  window.compareList = [];
  document.getElementById('compare').innerHTML = '<p><em>No officials selected for comparison.</em></p>';
}
function resetUI() {
  showTab('my-officials');
  document.getElementById('modal').style.display = 'none';
  window.compareList = [];
  window.pinnedOfficials = [];
  document.getElementById('results').innerHTML = '';
  document.getElementById('search').value = '';
}
function renderHeader() {
  const header = document.getElementById('header');
  if (!header) return;

  header.innerHTML = `
    <img src="logo.png" alt="Electorate Logo" class="logo" />
    <h1>Electorate</h1>
    <p class="tagline">Civic clarity. Public power. Built to last.</p>
  `;
}
function renderTabs() {
  const tabs = [
    { id: 'my-officials', label: 'My Officials' },
    { id: 'compare', label: 'Compare' },
    { id: 'rankings', label: 'Rankings' },
    { id: 'rookies', label: 'Rookies' },
    { id: 'calendar', label: 'Calendar' },
    { id: 'registration', label: 'Voting & Registration' }
  ];

  const nav = document.getElementById('tab-nav');
  if (!nav) return;

  nav.innerHTML = '';

  tabs.forEach(tab => {
    const button = document.createElement('button');
    button.className = 'tab-button';
    button.setAttribute('data-tab', tab.id);
    button.textContent = tab.label;
    nav.appendChild(button);
  });
}
document.addEventListener('DOMContentLoaded', () => {
  renderHeader();
  renderTabs();
  initUI();
  loadData();
  showTab('my-officials');
});
