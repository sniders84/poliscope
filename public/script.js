// --- Tabs (single canonical function) ---
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
// --- Rookie Logic ---
function isRookie(person) {
  const termStart = person.termStart;
  const termStartStr = typeof termStart === 'string' ? termStart : '';

  return person.firstTerm === true || /^20(2[3-9]|3[0-9])/.test(termStartStr);
}
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
  "Alabama": {
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
  const container = document.getElementById('calendar-container');
  if (!container) return;

  const today = new Date();

  const filtered = events
    .filter(e => e.state === selectedState && new Date(e.date) >= today)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const html = filtered.map(event => `
    <div class="card" onclick="openEventModal('${escapeJs(event.title)}', '${event.date}', '${escapeJs(event.state)}', '${escapeJs(event.type)}', '${escapeJs(event.details)}', '${event.link}')">
      <h3>${event.title}</h3>
      <p><strong>Date:</strong> ${event.date}</p>
      <p><strong>Type:</strong> ${event.type}</p>
    </div>
  `).join('');

  container.innerHTML = html || `<p>No upcoming events for ${selectedState}.</p>`;
}

function openEventModal(title, date, state, type, details, link) {
  const content = `
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
  const modalContent = document.getElementById('modal-content');
  if (!modalContent) return;
  modalContent.innerHTML = content;
  const overlay = document.getElementById('modal-overlay');
  if (overlay) overlay.style.display = 'flex';

  const closeBtn = document.getElementById('event-modal-close');
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
}
function showTab(tabId) {
  document.querySelectorAll('section').forEach(section => {
    section.style.display = 'none';
  });
  const target = document.getElementById(tabId);
  if (target) target.style.display = 'block';

  if (tabId === 'rankings') renderRankings();
  if (tabId === 'rookies') renderRookies();
}
/* ---------------- VOTING RENDER ---------------- */
function renderVotingInfo(state) {
  const container = document.getElementById('voting-container');
  if (!container || !votingInfo[state]) {
    if (container) container.innerHTML = `<p>No voting info available for ${state}.</p>`;
    return;
  }

  const info = votingInfo[state];
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
// Basic escaping to avoid quotes breaking injected onclick strings
function escapeJs(str = '') {
  return String(str).replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
}

/* ---------------- OFFICIALS RENDER ---------------- */
function renderCards(data, containerId) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.warn(`Missing container: ${containerId}`);
    return;
  }

  const cardsHTML = data.map(person => {
    const imageUrl = person.photo?.trim() || 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/No_image_available.svg/200px-No_image_available.svg.png';
    const partyLower = (person.party || '').toLowerCase();
    const partyColor = partyLower.includes("repub") ? "#d73027" :
                       partyLower.includes("dem") ? "#4575b4" :
                       partyLower.includes("libert") ? "#fdae61" :
                       partyLower.includes("indep") ? "#999999" :
                       partyLower.includes("green") ? "#66bd63" :
                       partyLower.includes("constit") ? "#984ea3" :
                       "#cccccc";

    // Use data-slug attribute used by the click handler
    return `
      <div class="card" data-slug="${person.slug}" onclick="expandCard('${person.slug}')" style="border-left: 8px solid ${partyColor};">
        <img src="${person.photo || 'https://via.placeholder.com/200x300?text=No+Photo'}" />
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
  const imageUrl = person.imageUrl || person.photo || 'images/fallback.jpg';
  const link = person.ballotpediaLink || person.contact?.website || '';

  let billsHTML = '';
  if (person.billsSigned?.length) {
    billsHTML = `
      <p><strong>Key Bills Signed:</strong></p>
      <ul>
        ${person.billsSigned.map(bill => `<li><a href="${bill.link}" target="_blank" rel="noopener noreferrer">${bill.title}</a></li>`).join('')}
      </ul>
    `;
  }

  let followThroughHTML = '';
  if (person.platformFollowThrough && Object.keys(person.platformFollowThrough).length) {
    followThroughHTML = `
      <div class="platform-followthrough">
        <h3>Platform Follow-Through</h3>
        <ul>
          ${Object.entries(person.platformFollowThrough).map(([key, value]) => `
            <li><strong>${key}:</strong> ${value}</li>
          `).join('')}
        </ul>
      </div>
    `;
  }

  const modalHTML = `
    <div class="modal-container">
      <div class="modal-left">
        <img src="${person.photo || 'https://via.placeholder.com/200x300?text=No+Photo'}" />
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
  if (!modalContent) return;
  modalContent.innerHTML = modalHTML;

  const overlay = document.getElementById('modal-overlay');
  if (overlay) overlay.style.display = 'flex';

  const closeBtn = document.getElementById('modal-close-btn');
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
}

function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  if (overlay) overlay.style.display = 'none';
  const modalContent = document.getElementById('modal-content');
  if (modalContent) modalContent.innerHTML = '';
}

/* ---------------- INDIVIDUAL LIST RENDERS ---------------- */
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

  console.log("Filtered My Officials:", matches.map(p => `${p.name} (${p.office})`));
  renderCards(matches, 'my-cards');
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

/* ---------------- RANKINGS & ROOKIES ---------------- */
function renderRankings() {
  const governors = allOfficials.filter(p => p.office?.includes("Governor") && !p.office?.includes("LtGovernor"));
  const ltGovernors = allOfficials.filter(p => p.office?.includes("LtGovernor"));
  const senators = allOfficials.filter(p => p.office?.includes("Senator"));
  const house = allOfficials.filter(p => p.office?.includes("Representative"));

  renderCards(governors, 'rankings-governors');
  renderCards(senators, 'rankings-senators');
  renderCards(house, 'rankings-house');
  renderCards(ltGovernors, 'rankings-ltgovernors');
 // ✅ This makes them show up
}

function renderRookies() {
  const rookies = window.allOfficials.filter(person => isRookie(person));

  const groups = {
    governor: [],
    senator: [],
    representative: [],
    ltgovernor: []
  };

 rookies.forEach(person => {
  const role = (person.office || person.position || "").toLowerCase();

  if (role.includes("senator")) {
    groups.senator.push(person);
  } else if (role.includes("representative") || role.includes("house")) {
    groups.representative.push(person);
  } else if (
    role.includes("lt. governor") ||
    role.includes("lt governor") ||
    role.includes("ltgovernor") ||
    role.includes("lieutenant governor")
  ) {
    groups.ltgovernor.push(person);
  } else if (role.includes("governor")) {
    groups.governor.push(person);
  }
});
  renderCards(groups.governor, 'rookie-governors');
  renderCards(groups.senator, 'rookie-senators');
  renderCards(groups.representative, 'rookie-house');
  renderCards(groups.ltgovernor, 'rookie-ltgovernors');
}
/* ---------------- COMPARE ---------------- */
function populateCompareDropdowns() {
  const left = document.getElementById('compare-left');
  const right = document.getElementById('compare-right');
  if (!left || !right) return;

  left.innerHTML = '<option value="">Select official A</option>';
  right.innerHTML = '<option value="">Select official B</option>';

  allOfficials.forEach(person => {
    const label = `${person.name} (${person.state}${person.party ? ', ' + person.party : ''})`;
    left.add(new Option(label, person.slug));
    right.add(new Option(label, person.slug));
  });

  left.addEventListener('change', e => renderCompareCard(e.target.value, 'compare-card-left'));
  right.addEventListener('change', e => renderCompareCard(e.target.value, 'compare-card-right'));
}

function renderCompareCard(slug, containerId) {
  const person = allOfficials.find(p => p.slug === slug);
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!person) {
    container.innerHTML = '<p>No official selected.</p>';
    return;
  }

  const imageUrl = person.photo?.trim() || 'https://via.placeholder.com/200x300?text=No+Photo';
  const link = person.ballotpediaLink || person.contact?.website || null;

  container.innerHTML = `
    <div class="card">
      <img src="${person.photo || 'https://via.placeholder.com/200x300?text=No+Photo'}" />
      <h3>${person.name}</h3>
      <p><strong>Office:</strong> ${person.office || person.position || ''}</p>
      <p><strong>State:</strong> ${person.state}</p>
      <p><strong>Party:</strong> ${person.party || '—'}</p>
      <p><strong>Term:</strong> ${person.termStart || '—'} to ${person.termEnd || '—'}</p>
      ${link ? `<p><a href="${link}" target="_blank" rel="noopener noreferrer">External Profile</a></p>` : ''}
    </div>
  `;
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

    // ✅ Compose global officials list WITHOUT Lt. Governors
    window.allOfficials = [...(governors || []), ...(senate || []), ...(house || []), ...(ltGovernors || [])];
    allOfficials = window.allOfficials;
    
    // ✅ Populate UI
    populateCompareDropdowns();
    renderRankings();
    renderRookies();

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

      stateSelect.addEventListener('change', function (e) {
        const selectedState = e.target.value;
        renderMyOfficials(selectedState);
        renderCalendar(calendarEvents, selectedState);
        renderVotingInfo(selectedState);
      });
    } else {
      renderMyOfficials('Alabama');
      renderCalendar(calendarEvents, 'Alabama');
      renderVotingInfo('Alabama');
    }
  } catch (err) {
    console.error("Error loading data:", err);
  }
}

/* Wait for window.cleanedHouse to be available (if other script produces it) */
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

  // Search input logic
  const search = document.getElementById('search');
  const results = document.getElementById('results');

  if (search) {
    search.addEventListener('input', function (e) {
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

  // Calendar initial render & state sync (ensures calendar updates if state-select exists)
  const stateSelect = document.getElementById('state-select');
  if (stateSelect) {
    const defaultState = stateSelect.value || 'Alabama';
    renderCalendar(calendarEvents, defaultState);

    stateSelect.addEventListener('change', () => {
      renderCalendar(calendarEvents, stateSelect.value);
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
