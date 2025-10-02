/* --- Poliscope Main Script: Clean Complete Rewrite --- */

/** ---- GLOBALS ---- */
let allOfficials = [];
let calendarEvents = [
  // ... (keep your provided calendarEvents array here)
];

const votingInfo = {
  Alabama: {
    registrationLink: "https://www.sos.alabama.gov/alabama-votes/voter/register-to-vote",
    statusCheckLink: "https://myinfo.alabamavotes.gov/voterview/",
    pollingPlaceLink: "https://myinfo.alabamavotes.gov/voterview/",
    volunteerLink: "https://www.sos.alabama.gov/alabama-votes/become-poll-worker",
    absenteeLink: "https://www.sos.alabama.gov/alabama-votes/voter/absentee-voting",
    registrationDeadline: "2025-10-21",
    absenteeRequestDeadline: "2025-10-29",
    absenteeReturnDeadline: "2025-11-04 12:00 PM",
    earlyVotingStart: null,
    earlyVotingEnd: null
  }
  // Add more states as needed
};

/** ---- UTILS ---- */
function escapeJs(str = '') {
  return String(str)
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}

function getSafePhotoUrl(person) {
  const raw = person.photo;
  if (!raw || typeof raw !== 'string') return 'https://via.placeholder.com/200x300?text=No+Photo';
  const trimmed = raw.trim();
  const isBroken =
    trimmed === '' ||
    trimmed.startsWith('200x300') ||
    trimmed.startsWith('/200x300') ||
    trimmed.includes('?text=No+Photo') ||
    !trimmed.startsWith('http') ||
    trimmed.includes('ERR_NAME_NOT_RESOLVED');
  return isBroken ? 'https://via.placeholder.com/200x300?text=No+Photo' : trimmed;
}

/** ---- TABS ---- */
window.showTab = function(tabId) {
  // Hide all sections
  document.querySelectorAll('section').forEach(sec => sec.style.display = 'none');
  // Show requested
  const target = document.getElementById(tabId);
  if (target) target.style.display = 'block';

  // Rerender for stateful sections
  const selectedState = document.getElementById('state-select').value;

  switch(tabId) {
    case 'my-officials':
      renderMyOfficials(selectedState);
      break;
    case 'polls':
      renderPollsForState(selectedState);
      break;
    case 'rankings':
      renderRankings();
      break;
    case 'calendar':
      renderCalendar(calendarEvents, selectedState);
      break;
    case 'registration':
      renderVotingInfo(selectedState);
      break;
  }
};

/** ---- MODAL ---- */
function openModal(html) {
  const overlay = document.getElementById('modal-overlay');
  const content = document.getElementById('modal-content');
  if (overlay && content) {
    content.innerHTML = html;
    overlay.style.display = 'flex';
  }
}
function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  const content = document.getElementById('modal-content');
  if (overlay) overlay.style.display = 'none';
  if (content) content.innerHTML = '';
}
window.closeModal = closeModal;

/** ---- OFFICIAL CARDS ---- */
function renderCards(data, containerId) {
  let container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = data.map(person => {
    const partyLower = (person.party || '').toLowerCase();
    const partyColor =
      partyLower.includes("repub") ? "#d73027" :
      partyLower.includes("dem") ? "#4575b4" :
      partyLower.includes("libert") ? "#fdae61" :
      partyLower.includes("indep") ? "#999999" :
      partyLower.includes("green") ? "#66bd63" :
      partyLower.includes("constit") ? "#984ea3" :
      "#cccccc";
    const imageUrl = getSafePhotoUrl(person);
    return `
      <div class="card" style="border-left: 8px solid ${partyColor}; cursor:pointer;" onclick="expandCard('${escapeJs(person.slug)}')">
        <img src="${imageUrl}" alt="${escapeJs(person.name)}" />
        <h3>${person.name}</h3>
        <p>${person.office || person.position || ''}</p>
        <p>${person.state}${person.party ? ', ' + person.party : ''}</p>
      </div>
    `;
  }).join('');
}
window.expandCard = function(slug) {
  const person = allOfficials.find(p => p.slug === slug);
  if (!person) return;
  // Modal HTML
  const imageUrl = getSafePhotoUrl(person);
  const link = person.ballotpediaLink || person.contact?.website || '';
  let html = `
    <div class="modal-container">
      <div class="modal-left">
        <img src="${imageUrl}" />
        <h2>${person.name}</h2>
        ${link ? `<p><a href="${link}" target="_blank" rel="noopener noreferrer">External Profile</a></p>` : ''}
        <p><strong>Contact:</strong>
          ${person.contact?.email ? `<a href="mailto:${person.contact.email}" class="contact-icon">📧</a>` : ''}
          ${person.contact?.phone ? `<a href="tel:${person.contact.phone.replace(/[^0-9]/g, '')}" class="contact-icon">📞</a>` : ''}
          ${person.contact?.website ? `<a href="${person.contact.website}" target="_blank" rel="noopener noreferrer" class="contact-icon">🌐</a>` : ''}
        </p>
      </div>
      <div class="modal-right">
        ${person.bio ? `<p><strong>Bio:</strong> ${person.bio}</p>` : ''}
        ${person.education ? `<p><strong>Education:</strong> ${person.education}</p>` : ''}
        ${person.endorsements ? `<p><strong>Endorsements:</strong> ${person.endorsements}</p>` : ''}
        ${person.platform ? `<p><strong>Platform:</strong> ${person.platform}</p>` : ''}
        ${person.platformFollowThrough && Object.keys(person.platformFollowThrough).length
          ? `<div class="platform-followthrough"><h3>Platform Follow-Through</h3><ul>${
            Object.entries(person.platformFollowThrough).map(([k, v]) => `<li><strong>${k}:</strong> ${v}</li>`).join('')
          }</ul></div>`
          : ''}
        ${person.proposals ? `<p><strong>Legislative Proposals:</strong> ${person.proposals}</p>` : ''}
        ${person.billsSigned?.length
          ? `<p><strong>Key Bills Signed:</strong></p><ul>${
            person.billsSigned.map(b => `<li><a href="${b.link}" target="_blank">${b.title}</a></li>`).join('')
          }</ul>`
          : ''}
        ${person.vetoes ? `<p><strong>Vetoes:</strong> ${person.vetoes}</p>` : ''}
        ${person.salary ? `<p><strong>Salary:</strong> ${person.salary}</p>` : ''}
        ${person.predecessor ? `<p><strong>Predecessor:</strong> ${person.predecessor}</p>` : ''}
        ${person.donationLink ? `<p><strong>Donate:</strong> <a href="${person.donationLink}" target="_blank">💸</a></p>` : ''}
      </div>
    </div>
  `;
  openModal(html);
};

/** ---- MY OFFICIALS ---- */
function renderMyOfficials(state) {
  if (!state) return;
  const matches = allOfficials.filter(p =>
    p.state === state || p.stateName === state || p.stateAbbreviation === state
  );
  // Sort by role
  const roleOrder = ['senator', 'representative', 'governor', 'lt. governor', 'lt governor', 'ltgovernor', 'lieutenant governor'];
  matches.sort((a, b) => {
    const roleA = (a.office || a.position || '').toLowerCase();
    const roleB = (b.office || b.position || '').toLowerCase();
    const idxA = roleOrder.findIndex(role => roleA.includes(role));
    const idxB = roleOrder.findIndex(role => roleB.includes(role));
    return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
  });
  renderCards(matches, 'my-cards');
}

/** ---- RANKINGS ---- */
function renderRankings() {
  const governors = allOfficials.filter(p => {
    const role = (p.office || p.position || "").toLowerCase();
    return role.includes("governor") && !role.includes("lt") && !role.includes("lieutenant");
  });
  const ltGovernors = allOfficials.filter(p => {
    const role = (p.office || p.position || "").toLowerCase();
    return (
      role.includes("lt. governor") ||
      role.includes("lt governor") ||
      role.includes("ltgovernor") ||
      role.includes("lieutenant governor")
    );
  });
  const senators = allOfficials.filter(p => p.office?.includes("Senator"));
  const house = allOfficials.filter(p => p.office?.includes("Representative"));
  renderCards(governors, 'rankings-governors');
  renderCards(senators, 'rankings-senators');
  renderCards(house, 'rankings-house');
  renderCards(ltGovernors, 'rankings-ltgovernors');
}

/** ---- CALENDAR ---- */
function renderCalendar(events, selectedState) {
  const container = document.getElementById("calendar-container");
  if (!container) return;
  const today = new Date();
  const selected = (selectedState || "").trim().toLowerCase();
  const filtered = events.filter(e => {
    const eventState = (e.state || "").trim().toLowerCase();
    const eventDate = new Date(e.date);
    return (
      (eventState === selected || eventState === "all") &&
      !isNaN(eventDate) &&
      eventDate >= today
    );
  }).sort((a, b) => new Date(a.date) - new Date(b.date));
  container.innerHTML = filtered.length
    ? filtered.map(event => `
      <div class="card" onclick="openEventModal('${escapeJs(event.title)}', '${event.date}', '${escapeJs(event.state)}', '${escapeJs(event.type)}', '${escapeJs(event.details)}', '${event.link}')">
        <h3>${event.title}</h3>
        <p><strong>Date:</strong> ${event.date}</p>
        <p><strong>Type:</strong> ${event.type}</p>
      </div>
    `).join('')
    : `<p>No upcoming events for ${selectedState}.</p>`;
}
window.openEventModal = function(title, date, state, type, details, link) {
  openModal(`
    <div class="event-modal">
      <h2>${title}</h2>
      <p><strong>Date:</strong> ${date}</p>
      <p><strong>State:</strong> ${state}</p>
      <p><strong>Type:</strong> ${type}</p>
      <p>${details}</p>
      <p><a href="${link}" target="_blank" rel="noopener noreferrer">More Info</a></p>
    </div>
  `);
};

/** ---- VOTING INFO ---- */
function renderVotingInfo(state) {
  const container = document.getElementById('voting-container');
  const info = votingInfo[state];
  if (!container || !info) {
    if (container) container.innerHTML = `<p>No voting info available for ${state}.</p>`;
    return;
  }
  container.innerHTML = `
    <div class="card">
      <h3>Register to Vote in ${state}</h3>
      <p><a href="${info.registrationLink}" target="_blank">Register Online</a></p>
      <p><a href="${info.statusCheckLink}" target="_blank">Check Registration Status</a></p>
      <p><strong>Deadline:</strong> ${info.registrationDeadline}</p>
    </div>
    <div class="card">
      <h3>Polling Place</h3>
      <p><a href="${info.pollingPlaceLink}" target="_blank">Find Your Polling Place</a></p>
    </div>
    <div class="card">
      <h3>Vote by Mail</h3>
      <p><a href="${info.absenteeLink}" target="_blank">Request Absentee Ballot</a></p>
      <p><strong>Request Deadline:</strong> ${info.absenteeRequestDeadline}</p>
      <p><strong>Return Deadline:</strong> ${info.absenteeReturnDeadline}</p>
    </div>
    <div class="card">
      <h3>Volunteer</h3>
      <p><a href="${info.volunteerLink}" target="_blank">Become a Poll Worker</a></p>
    </div>
  `;
}

/** ---- POLLS ---- */
function renderPollsForState(stateName) {
  const pollsContainer = document.getElementById("polls-container");
  if (!pollsContainer || !stateName) return;
  pollsContainer.innerHTML = `
    <div class="card">
      <h3>${stateName} Polls</h3>
      <p>Source: Emerson College</p>
      <a href="https://emersoncollegepolling.com/category/state-polls/" target="_blank">View Emerson Polls</a>
    </div>
    <div class="card">
      <h3>${stateName} Polls</h3>
      <p>Source: RealClearPolitics</p>
      <a href="https://www.realclearpolitics.com/epolls/latest_polls/" target="_blank">View RCP Polls</a>
    </div>
  `;
}

/** ---- SEARCH ---- */
function filterOfficials() {
  const query = document.getElementById("search").value.toLowerCase();
  const selectedState = document.getElementById("state-select").value.toLowerCase();
  // Filter official cards
  const officialCards = document.querySelectorAll("#my-cards .card");
  officialCards.forEach(card => {
    const text = card.textContent.toLowerCase();
    const matchesQuery = text.includes(query);
    const matchesState = selectedState === "" || text.includes(selectedState);
    card.style.display = (matchesQuery && matchesState) ? "block" : "none";
  });
  // Filter poll cards
  const pollCards = document.querySelectorAll("#polls-container .card");
  pollCards.forEach(card => {
    const text = card.textContent.toLowerCase();
    const matchesQuery = text.includes(query);
    const matchesState = selectedState === "" || text.includes(selectedState);
    card.style.display = (matchesQuery && matchesState) ? "block" : "none";
  });
}

/** ---- LOAD DATA ---- */
async function loadData() {
  // Wait for cleanHouse.js to load window.cleanedHouse
  await new Promise(resolve => {
    const check = () => {
      if (window.cleanedHouse && Array.isArray(window.cleanedHouse)) resolve();
      else setTimeout(check, 50);
    };
    check();
  });
  const house = window.cleanedHouse || [];
  const governors = await fetch('./Governors.json').then(res => res.json()).catch(() => []);
  const senate = await fetch('./Senate.json').then(res => res.json()).catch(() => []);
  let ltGovernors = [];
  try {
    ltGovernors = await fetch('./LtGovernors.json').then(res => res.json()).catch(() => []);
  } catch {}
  window.allOfficials = [...(governors || []), ...(senate || []), ...(house || []), ...(ltGovernors || [])];
  allOfficials = window.allOfficials;

  // Populate state-select dropdown
  const stateSelect = document.getElementById('state-select');
  if (stateSelect) {
    const states = [...new Set(allOfficials.map(p => p.state).filter(Boolean))].sort();
    // Only add options not already present
    const existing = Array.from(stateSelect.options).map(opt => opt.value);
    states.forEach(state => {
      if (!existing.includes(state)) {
        const opt = document.createElement('option');
        opt.value = opt.text = state;
        stateSelect.appendChild(opt);
      }
    });
    // Set default
    stateSelect.value = stateSelect.querySelector('option[value="Alabama"]') ? 'Alabama' : (states[0] || '');
  }
  // Initial render
  const defaultState = stateSelect ? (stateSelect.value || 'Alabama') : 'Alabama';
  renderMyOfficials(defaultState);
  renderCalendar(calendarEvents, defaultState);
  renderVotingInfo(defaultState);
  renderPollsForState(defaultState);
}
document.addEventListener('DOMContentLoaded', function () {
  loadData();

  // State select logic
  const stateSelect = document.getElementById('state-select');
  if (stateSelect) {
    stateSelect.addEventListener('change', function () {
      const selectedState = this.value;
      renderMyOfficials(selectedState);
      renderCalendar(calendarEvents, selectedState);
      renderVotingInfo(selectedState);
      renderPollsForState(selectedState);
      window.showTab("my-officials");
    });
  }

  // Search logic
  const search = document.getElementById('search');
  if (search) {
    search.addEventListener('input', filterOfficials);
    // Clear results on click outside
    document.addEventListener('click', function (e) {
      if (!search.contains(e.target)) search.value = '';
    });
  }

  // Modal overlay click to close
  const overlay = document.getElementById('modal-overlay');
  if (overlay) {
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeModal();
    });
  }

  // Tab button wiring (use nav > button, not .tab-button)
  document.querySelectorAll('#tabs button').forEach(button => {
    button.addEventListener('click', () => {
      // Remove 'active' from all, add to this
      document.querySelectorAll('#tabs button').forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      const tabId = button.getAttribute('onclick').match(/'(.+)'/)[1];
      window.showTab(tabId);
    });
  });

  // Start on My Officials tab
  window.showTab('my-officials');
});
