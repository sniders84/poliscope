/* ---------------- CALENDAR RENDERING ---------------- */
window.renderCalendarForState = function(state) {
  const tables = document.querySelectorAll('.calendar-table');
  tables.forEach(table => table.style.display = 'none');

  const activeTable = document.getElementById(`calendar-${state}`);
  if (activeTable) activeTable.style.display = 'table';
};

/* ---------------- UTILITY FUNCTIONS ---------------- */
function escapeJs(str) {
  return str.replace(/'/g, "\\'").replace(/"/g, '\\"');
}

/* ---------------- TAB LOGIC ---------------- */
window.showTab = function(tabId) {
  const sections = ['my-officials', 'polls', 'rankings', 'calendar', 'registration'];
  sections.forEach(sectionId => {
    const el = document.getElementById(sectionId);
    if (el) el.style.display = sectionId === tabId ? 'block' : 'none';
  });
// --- Photo URL Logic ---
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
document.getElementById('state-select').addEventListener('change', function() {
  const selected = this.value;
  window.selectedState = selected; // ✅ stores globally
});
/* ---------------- CALENDAR EVENTS ---------------- */
const calendarEvents = [
  {
    title: "General Election",
    date: "2025-11-04",
    state: "Alabama",
    type: "Election",
    link: "https://www.vote411.org/upcoming/1/events",
    details: "Statewide general election including Governor and House seats."
  },
  {
    title: "Municipal Runoff Election (if needed)",
    date: "2025-10-07",
    state: "Alabama",
    type: "Election",
    link: "https://www.sos.alabama.gov/alabama-votes/voter/election-information/2025",
    details: "Runoff elections for municipalities where no candidate received a majority."
  },
  {
    title: "Town Hall with Gov. Kay Ivey",
    date: "2025-10-15",
    state: "Alabama",
    type: "Public Engagement",
    link: "https://governor.alabama.gov/newsroom/",
    details: "Public Q&A session in Montgomery. Open to all residents."
  },
  {
    title: "Last Day to Register for General Election",
    date: "2025-10-21",
    state: "Alabama",
    type: "Deadline",
    link: "https://www.sos.alabama.gov/alabama-votes/voter/register-to-vote",
    details: "Deadline to register to vote in the November 4 general election."
  },
  {
    title: "Signed 'Working for Alabama' Legislative Package",
    date: "2025-05-01",
    state: "Alabama",
    type: "Bill Signing",
    link: "https://governor.alabama.gov/newsroom/2024/05/governor-ivey-signs-landmark-working-for-alabama-legislative-package-into-law/",
    details: "Six-bill package to boost workforce participation, childcare access, and rural job growth."
  }
];

/* ---------------- VOTING INFO ---------------- */
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
};

/* ---------------- GLOBAL STATE ---------------- */
let allOfficials = [];

/* ---------------- CALENDAR RENDER ---------------- */
function renderCalendar(events, selectedState) {
  const container = document.getElementById("calendar-container");
  if (!container) return;

  const today = new Date();
  const selected = (selectedState || "").trim().toLowerCase();

  const filtered = events
    .filter(e => {
      const eventState = (e.state || "").trim().toLowerCase();
      const eventDate = new Date(e.date);
      return (
        (eventState === selected || eventState === "all") &&
        !isNaN(eventDate) &&
        eventDate >= today
      );
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date));

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
/* ---------------- REGISTRATION RENDER ---------------- */
function renderRegistration(selectedState) {
  const container = document.getElementById("registration-container");
  if (!container) return;

  const info = votingInfo[selectedState];
  if (!info) {
    container.innerHTML = `<p>No registration info available for ${selectedState}.</p>`;
    return;
  }

  container.innerHTML = `
    <div class="card">
      <h3>Register to Vote in ${selectedState}</h3>
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
/* ---------------- MODAL LOGIC ---------------- */
function openEventModal(title, date, state, type, details, link) {
  const modalContent = document.getElementById('modal-content');
  const overlay = document.getElementById('modal-overlay');
  if (!modalContent || !overlay) return;

  modalContent.innerHTML = `
    <div class="event-modal">
      <h2>${title}</h2>
      <p><strong>Date:</strong> ${date}</p>
      <p><strong>State:</strong> ${state}</p>
      <p><strong>Type:</strong> ${type}</p>
      <p>${details}</p>
      <p><a href="${link}" target="_blank" rel="noopener noreferrer">More Info</a></p>
      <p><button id="event-modal-close">Close</button></p>
    </div>
  `;
  overlay.style.display = 'flex';

  const closeBtn = document.getElementById('event-modal-close');
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
}

/* ---------------- VOTING RENDER ---------------- */
function renderVotingInfo(state) {
  const container = document.getElementById('voting-container');
  const info = votingInfo[state];

  if (!container || !info) {
    if (container) container.innerHTML = `<p>No voting info available for ${state}.</p>`;
    return;
  }

  container.innerHTML = `
    <div class="card">
      <h3>Register to Vote</h3>
      <p><a href="${info.registrationLink}" target="_blank">Register Online</a></p>
      <p><a href="${info.statusCheckLink}" target="_blank">Check Registration Status</a></p>
      <p><strong>Deadline:</strong> ${info.registrationDeadline}</p>
    </div>
    <div class="card">
      <h3>Find Your Polling Place</h3>
      <p><a href="${info.pollingPlaceLink}" target="_blank">Polling Place Lookup</a></p>
      ${info.earlyVotingStart ? `<p><strong>Early Voting:</strong> ${info.earlyVotingStart} to ${info.earlyVotingEnd}</p>` : '<p><em>Early voting not available statewide.</em></p>'}
    </div>
    <div class="card">
      <h3>Vote by Mail</h3>
      <p><a href="${info.absenteeLink}" target="_blank">Request Absentee Ballot</a></p>
      <p><strong>Request Deadline:</strong> ${info.absenteeRequestDeadline}</p>
      <p><strong>Return Deadline:</strong> ${info.absenteeReturnDeadline}</p>
      <p>Must include a copy of valid photo ID.</p>
    </div>
    <div class="card">
      <h3>Volunteer</h3>
      <p><a href="${info.volunteerLink}" target="_blank">Become a Poll Worker</a></p>
    </div>
  `;
}
/* ---------------- UTIL ---------------- */
function escapeJs(str = '') {
  return String(str)
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}

/* ---------------- OFFICIALS RENDER ---------------- */
function renderCards(data, containerId) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.warn(`Missing container: ${containerId}`);
    return;
  }

  const cardsHTML = data.map(person => {
    const imageUrl = getSafePhotoUrl(person);
    const partyLower = (person.party || '').toLowerCase();
    const partyColor =
      partyLower.includes("repub") ? "#d73027" :
      partyLower.includes("dem") ? "#4575b4" :
      partyLower.includes("libert") ? "#fdae61" :
      partyLower.includes("indep") ? "#999999" :
      partyLower.includes("green") ? "#66bd63" :
      partyLower.includes("constit") ? "#984ea3" :
      "#cccccc";

    return `
      <div class="card" data-slug="${person.slug}" onclick="expandCard('${person.slug}')" style="border-left: 8px solid ${partyColor};">
        <img src="${imageUrl}" />
        <h3>${person.name}</h3>
        <p>${person.office || person.position || ''}</p>
        <p>${person.state}${person.party ? ', ' + person.party : ''}</p>
      </div>
    `;
  }).join('');

  container.innerHTML = cardsHTML;
}

function expandCard(slug) {
  const person = allOfficials.find(p => p.slug === slug);
  if (person) openModal(person);
}

function openModal(person) {
  const imageUrl = getSafePhotoUrl(person);
  const link = person.ballotpediaLink || person.contact?.website || '';

  const billsHTML = person.billsSigned?.length
    ? `<p><strong>Key Bills Signed:</strong></p><ul>${person.billsSigned.map(bill =>
        `<li><a href="${bill.link}" target="_blank" rel="noopener noreferrer">${bill.title}</a></li>`
      ).join('')}</ul>`
    : '';

  const followThroughHTML = person.platformFollowThrough && Object.keys(person.platformFollowThrough).length
    ? `<div class="platform-followthrough"><h3>Platform Follow-Through</h3><ul>${
        Object.entries(person.platformFollowThrough).map(([key, value]) =>
          `<li><strong>${key}:</strong> ${value}</li>`
        ).join('')
      }</ul></div>`
    : '';

  const modalHTML = `
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
        ${followThroughHTML}
        ${person.proposals ? `<p><strong>Legislative Proposals:</strong> ${person.proposals}</p>` : ''}
        ${billsHTML}
        ${person.vetoes ? `<p><strong>Vetoes:</strong> ${person.vetoes}</p>` : ''}
        ${person.salary ? `<p><strong>Salary:</strong> ${person.salary}</p>` : ''}
        ${person.predecessor ? `<p><strong>Predecessor:</strong> ${person.predecessor}</p>` : ''}
        ${person.donationLink ? `<p><strong>Donate:</strong> <a href="${person.donationLink}" target="_blank" rel="noopener noreferrer">💸</a></p>` : ''}
        <p><button id="modal-close-btn">Close</button></p>
      </div>
    </div>
  `;

  const modalContent = document.getElementById('modal-content');
  const overlay = document.getElementById('modal-overlay');
  if (!modalContent || !overlay) return;

  modalContent.innerHTML = modalHTML;
  overlay.style.display = 'flex';

  const closeBtn = document.getElementById('modal-close-btn');
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
}

function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  const modalContent = document.getElementById('modal-content');
  if (overlay) overlay.style.display = 'none';
  if (modalContent) modalContent.innerHTML = '';
}
/* ---------------- INDIVIDUAL LIST RENDERS ---------------- */
function renderPolls(selectedState) {
  const pollsContainer = document.getElementById('polls-container');
  if (!pollsContainer) return;

  const filtered = (window.polls || []).filter(
    poll => poll.state && poll.state.trim().toLowerCase() === (selectedState || '').trim().toLowerCase()
  );

  if (filtered.length === 0) {
    pollsContainer.innerHTML = `<p>No polls for this state.</p>`;
    return;
  }

  pollsContainer.innerHTML = filtered.map(poll => `
    <div class="poll-card">
      <h3>${poll.title}</h3>
      <p><strong>Date:</strong> ${poll.date || ''}</p>
      <p><strong>Type:</strong> ${poll.type || ''}</p>
      <p>${poll.details || ''}</p>
      <p><a href="${poll.link}" target="_blank" rel="noopener noreferrer">More info</a></p>
    </div>
  `).join('');
}

function renderMyOfficials(state) {
  const matches = window.allOfficials.filter(person => {
    const stateMatch =
      person.state === state ||
      person.stateName === state ||
      person.stateAbbreviation === state;
    return stateMatch;
  });
  const roleOrder = ['senator', 'representative', 'governor', 'lt. governor', 'lt governor', 'ltgovernor', 'lieutenant governor'];

  matches.sort((a, b) => {
    const roleA = (a.office || a.position || '').toLowerCase();
    const roleB = (b.office || b.position || '').toLowerCase();

    const indexA = roleOrder.findIndex(role => roleA.includes(role));
    const indexB = roleOrder.findIndex(role => roleB.includes(role));

    return indexA - indexB;
  });

  const container = document.getElementById("my-cards");
  if (!container) return;
  container.innerHTML = "";

  matches.forEach(person => {
    const card = document.createElement("div");
    card.className = "card";
    card.textContent = `${person.name} – ${person.office || person.position || 'Unknown'} – ${person.state}`;
    container.appendChild(card);
  });

  console.log("Rendered My Officials:", matches.map(p => `${p.name} (${p.office})`));
}
  renderCards(matches, 'my-cards'); // ✅ uses full card markup with modal logic
}

function renderLtGovernors(data) {
  const container = document.getElementById('lt-governors-container');
  if (!container) return;

  container.innerHTML = '';
  data.forEach(gov => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <h3>${gov.name}</h3>
      <p>${gov.state}</p>
      <img src="${gov.photo || 'https://via.placeholder.com/200x300?text=No+Photo'}" alt="${gov.name}" />
    `;
    container.appendChild(card);
  });
}

/* ---------------- RANKINGS ---------------- */
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
/* ---------------- DATA LOADING ---------------- */
async function loadData() {
  try {
    await waitForHouseData();

    const house = window.cleanedHouse || [];
    const governors = await fetch('Governors.json').then(res => res.json()).catch(() => []);
    const senate = await fetch('Senate.json').then(res => res.json()).catch(() => []);
    let ltGovernors = [];

    try {
      const res = await fetch('LtGovernors.json');
      ltGovernors = await res.json();
      console.log('Lt. Governors loaded:', ltGovernors.length);
    } catch (err) {
      console.warn('LtGovernors.json not found or failed to parse.', err);
    }

    // ✅ Compose global officials list
    console.log("🧪 Governor count:", governors?.length);
    console.log("🧪 Senate count:", senate?.length);
    console.log("🧪 House count:", house?.length);
    console.log("🧪 Lt. Governor count:", ltGovernors?.length);

    window.allOfficials = [...(governors || []), ...(senate || []), ...(house || []), ...(ltGovernors || [])];
    allOfficials = window.allOfficials;

    const sarah = window.allOfficials.find(p =>
      (p.name || "").toLowerCase().includes("sanders")
    );
    console.log("🧪 Sarah Huckabee Sanders:", sarah);

    // ✅ Populate UI
    renderRankings();

    // ✅ State select setup
    const stateSelect = document.getElementById('state-select');
    if (stateSelect) {
      const states = [...new Set(allOfficials.map(p => p.state).filter(Boolean))].sort();
      stateSelect.innerHTML = '<option value="">Choose a state</option>' + states.map(state => `<option value="${state}">${state}</option>`).join('');
      stateSelect.value = stateSelect.querySelector('option[value="Alabama"]') ? 'Alabama' : (states[0] || '');

      const defaultState = stateSelect.value || 'Alabama';
      renderMyOfficials(defaultState);
      renderCalendar(calendarEvents, defaultState);
      renderVotingInfo(defaultState);
      renderPolls(defaultState);

      stateSelect.addEventListener('change', function (e) {
        const selectedState = e.target.value;
        renderMyOfficials(selectedState);
        renderCalendar(calendarEvents, selectedState);
        renderVotingInfo(selectedState);
        renderPolls(selectedState);
      });
    } else {
      renderMyOfficials('Alabama');
      renderCalendar(calendarEvents, 'Alabama');
      renderVotingInfo('Alabama');
      renderPolls('Alabama');
    }
  } catch (err) {
    console.error("Error loading data:", err);
  }
}

/* ---------------- HOUSE DATA WAIT ---------------- */
function waitForHouseData() {
  return new Promise(resolve => {
    const check = () => {
      if (window.cleanedHouse && Array.isArray(window.cleanedHouse)) {
        resolve();
      } else {
        setTimeout(check, 50);
      }
    };
    check();
  });
}
/* ---------------- BOOTSTRAP / DOM ---------------- */
document.addEventListener('DOMContentLoaded', function () {
  loadData();

  const stateSelect = document.getElementById('state-select');
  if (stateSelect) {
    const defaultState = stateSelect.value || 'Alabama';

    // Initial render
    renderMyOfficials(defaultState);
    renderCalendar(calendarEvents, defaultState);
    renderRegistration(defaultState);
    renderVotingInfo(defaultState);
    renderPollsForState(defaultState);

    // Unified listener
    stateSelect.addEventListener('change', function () {
      const selectedState = this.value;
      if (!selectedState) return;

      filterOfficials();
      renderMyOfficials(selectedState);
      renderCalendar(calendarEvents, selectedState);
      renderRegistration(selectedState);
      renderVotingInfo(selectedState);
      renderPollsForState(selectedState);
      showTab("my-officials");
    });
  }

  // Search input logic
  const search = document.getElementById('search');
  const results = document.getElementById('results');

  if (search) {
    search.addEventListener('input', function () {
  filterOfficials(); // ✅ triggers filtering across officials and polls
});
      const query = e.target.value.toLowerCase().trim();
      if (!query) {
        if (results) results.innerHTML = '';
        return;
      }

      const matches = allOfficials.filter(person =>
        (person.name || '').toLowerCase().includes(query) ||
        (person.state || '').toLowerCase().includes(query) ||
        ((person.party || '').toLowerCase().includes(query))
      );

      const resultsHTML = matches.map(person => {
        const label = `${person.name} (${person.state}${person.party ? ', ' + person.party : ''})`;
        const link = person.ballotpediaLink || person.contact?.website || null;

        return link
          ? `<li><a href="${link}" target="_blank" rel="noopener noreferrer">${label}</a></li>`
          : `<li>${label}</li>`;
      }).join('');

      if (results) results.innerHTML = resultsHTML || `<li>No matches for "${query}"</li>`;
    });

    // Click outside to clear results
    document.addEventListener('click', function (e) {
      if (search && results && !search.contains(e.target) && !results.contains(e.target)) {
        results.innerHTML = '';
        search.value = '';
      }
    });
  }

  // Modal overlay click to close
  const overlay = document.getElementById('modal-overlay');
  if (overlay) {
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeModal();
    });
  }

  // Tab button wiring
  document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
      const tabId = button.getAttribute('data-tab');
      document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      window.showTab(tabId);
    });
  });

  // Ensure UI starts at a sensible tab
  if (!document.querySelector('.tab-button.active')) {
    const firstTab = document.querySelector('.tab-button');
    if (firstTab) {
      firstTab.classList.add('active');
      const tabId = firstTab.getAttribute('data-tab');
      window.showTab(tabId);
    }
  }
});

/* ---------------- FILTERING ---------------- */
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
  const pollCards = document.querySelectorAll("#polls-container .poll-card, #polls-container .card");
  pollCards.forEach(card => {
    const text = card.textContent.toLowerCase();
    const matchesQuery = text.includes(query);
    const matchesState = selectedState === "" || text.includes(selectedState);
    card.style.display = (matchesQuery && matchesState) ? "block" : "none";
  });
}

/* ---------------- POLL SOURCES ---------------- */
function renderPollsForState(stateName) {
  const pollsContainer = document.getElementById("polls-container");
  if (!pollsContainer || !stateName) return;

  pollsContainer.innerHTML = "";

  const emersonCard = document.createElement("div");
  emersonCard.className = "card";
  emersonCard.innerHTML = `
    <h3>${stateName} Polls</h3>
    <p>Source: Emerson College</p>
    <a href="https://emersoncollegepolling.com/category/state-polls/" target="_blank">View Emerson Polls</a>
  `;
  pollsContainer.appendChild(emersonCard);

  const rcpCard = document.createElement("div");
  rcpCard.className = "card";
  rcpCard.innerHTML = `
    <h3>${stateName} Polls</h3>
    <p>Source: RealClearPolitics</p>
    <a href="https://www.realclearpolitics.com/epolls/latest_polls/" target="_blank">View RCP Polls</a>
  `;
  pollsContainer.appendChild(rcpCard);
}
