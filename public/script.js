/* ===========================
   Full app script.js
   - Loads Governors.json, Senate.json, House.json, LtGovernors.json
   - Populates allOfficials
   - Renders cards (with approval % if available)
   - Opens modal with enriched data
   - Search, tabs, compare, rankings, rookies, calendar & voting info
   =========================== */

(function () {
  'use strict';

  // ----- Helper: local fallback image inside assets/ -----
  const FALLBACK_IMG = 'assets/no-photo.png'; // put a file at public/assets/no-photo.png

  // ----- Utility: safely read approval rating from different possible fields -----
  function getApprovalPercent(person) {
    if (!person) return null;
    const candidates = ['approval', 'approvalRating', 'approval_percent', 'approvalPercentage', 'approval_percent_raw'];
    for (const key of candidates) {
      if (person[key] != null && person[key] !== '') {
        let val = person[key];
        // If value is decimal like 0.42, convert to percent
        if (typeof val === 'number') {
          if (val <= 1 && val >= 0) {
            return Math.round(val * 100);
          }
          return Math.round(val);
        }
        // If string like "42%" or "0.42"
        const asNum = Number(String(val).replace('%', '').trim());
        if (!Number.isNaN(asNum)) {
          if (asNum <= 1) return Math.round(asNum * 100);
          return Math.round(asNum);
        }
      }
    }
    return null;
  }

  // ----- Tabs (single canonical function) -----
  window.showTab = function (id) {
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

  // ----- Calendar & Voting static data (you can expand these .json-driven later) -----
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
      title: "Last Day to Register for General Election",
      date: "2025-10-21",
      state: "Alabama",
      type: "Deadline",
      link: "https://www.sos.alabama.gov/alabama-votes/voter/register-to-vote",
      details: "Deadline to register to vote in the November 4 general election."
    }
  ];

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

  // ----- Global state -----
  let allOfficials = [];

  // ----- Safe fetch helper -----
  async function safeFetchJson(path) {
    try {
      const res = await fetch(path);
      if (!res.ok) {
        console.warn('Failed to fetch', path, res.status);
        return [];
      }
      const data = await res.json();
      return Array.isArray(data) ? data : (data && typeof data === 'object' ? data : []);
    } catch (err) {
      console.warn('safeFetchJson error', path, err);
      return [];
    }
  }

  // ----- Render calendar ----- 
  function renderCalendar(events, selectedState) {
    const container = document.getElementById('calendar-container');
    if (!container) return;

    const today = new Date();
    const filtered = events
      .filter(e => e.state === selectedState && new Date(e.date) >= today)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    const html = filtered.map(event => `
      <div class="card" role="button" tabindex="0" onclick="openEventModal('${escapeJs(event.title)}','${event.date}','${escapeJs(event.state)}','${escapeJs(event.type)}','${escapeJs(event.details)}','${event.link}')">
        <h3>${event.title}</h3>
        <p><strong>Date:</strong> ${event.date}</p>
        <p><strong>Type:</strong> ${event.type}</p>
      </div>
    `).join('');

    container.innerHTML = html || `<p>No upcoming events for ${selectedState}.</p>`;
  }

  function openEventModal(title, date, state, type, details, link) {
    const modalContent = document.getElementById('modal-content');
    if (!modalContent) return;
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
    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.style.display = 'flex';
    const closeBtn = document.getElementById('event-modal-close');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
  }

  // ----- Voting info render -----
  function renderVotingInfo(state) {
    const container = document.getElementById('voting-container');
    if (!container) return;
    if (!votingInfo[state]) {
      container.innerHTML = `<p>No voting info available for ${state}.</p>`;
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
    `;
  }

  // ----- Escape JS for inline onclicks -----
  function escapeJs(str = '') {
    return String(str).replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
  }

  // ----- Render cards (with approval) -----
  function renderCards(data, containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
      // no container present, skip
      return;
    }

    // Build cards
    const cardsHTML = data.map(person => {
      // Determine image and approval
      const imageUrl = (person.photo && person.photo.trim()) ? person.photo.trim() : FALLBACK_IMG;
      const approval = getApprovalPercent(person);
      const partyLower = (person.party || '').toLowerCase();
      const partyColor = partyLower.includes("repub") ? "#d73027" :
                         partyLower.includes("dem") ? "#4575b4" :
                         partyLower.includes("libert") ? "#fdae61" :
                         partyLower.includes("indep") ? "#999999" :
                         partyLower.includes("green") ? "#66bd63" :
                         "#cccccc";

      // Card markup: include data-slug for robust event binding
      return `
        <div class="card" data-slug="${person.slug || ''}" role="button" tabindex="0" onclick="expandCard('${escapeJs(person.slug || '')}')"
             style="border-left: 8px solid ${partyColor};">
          <div class="card-image">
            <img src="${imageUrl}" alt="${person.name || 'No name'}" onerror="this.onerror=null;this.src='${FALLBACK_IMG}'" />
          </div>
          <div class="card-body">
            <h3>${person.name || '—'}</h3>
            <p class="office-line">${person.office || person.position || ''}</p>
            <p class="state-party">${person.state || ''}${person.party ? ', ' + person.party : ''}</p>
            ${approval != null ? `<div class="approval"><span class="approval-label">${approval}%</span>
               <progress value="${approval}" max="100"></progress></div>` : ''}
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = cardsHTML;
  }

  // ----- Expand card into modal (find by slug) -----
  window.expandCard = function (slug) {
    const person = allOfficials.find(p => p.slug === slug);
    if (!person) return;
    openModal(person);
  };

  // ----- Modal: show enriched info ----- 
  function openModal(person) {
    const modalContent = document.getElementById('modal-content');
    if (!modalContent) return;

    const imageUrl = (person.imageUrl || person.photo || '').trim() || FALLBACK_IMG;
    const approval = getApprovalPercent(person);
    const contact = person.contact || {};
    const link = person.ballotpediaLink || contact.website || '';

    // Bills
    let billsHTML = '';
    if (Array.isArray(person.billsSigned) && person.billsSigned.length > 0) {
      billsHTML = `<div class="card-subsection"><h4>Key Bills Signed</h4><ul>` +
        person.billsSigned.map(b => `<li>${b.title ? `<a href="${b.link || '#'}" target="_blank" rel="noopener noreferrer">${b.title}</a>` : (b.link ? `<a href="${b.link}" target="_blank">${b.link}</a>` : '')}</li>`).join('') +
        `</ul></div>`;
    }

    // Platform follow-through
    let followThroughHTML = '';
    if (person.platformFollowThrough && Object.keys(person.platformFollowThrough).length) {
      followThroughHTML = `<div class="card-subsection"><h4>Platform Follow-Through</h4><ul>` +
        Object.entries(person.platformFollowThrough).map(([k, v]) => `<li><strong>${k}:</strong> ${v}</li>`).join('') +
        `</ul></div>`;
    }

    // Polling / approval detail
    let pollingHTML = '';
    if (person.polling && Array.isArray(person.polling)) {
      pollingHTML = `<div class="card-subsection"><h4>Polling</h4><ul>` +
        person.polling.map(p => `<li>${p.source ? `<a href="${p.sourceUrl || '#'}" target="_blank">${p.source}</a>` : ''} — ${p.value || ''} ${p.date ? `(${p.date})` : ''}</li>`).join('') +
        `</ul></div>`;
    } else if (approval != null) {
      pollingHTML = `<div class="card-subsection"><h4>Approval</h4><p>${approval}%</p></div>`;
    }

    // Contact icons
    const contactIcons = `
      ${contact.email ? `<a href="mailto:${contact.email}" aria-label="Email">📧</a>` : ''}
      ${contact.phone ? `<a href="tel:${contact.phone.replace(/[^0-9]/g,'')}" aria-label="Phone">📞</a>` : ''}
      ${contact.website ? `<a href="${contact.website}" target="_blank" rel="noopener noreferrer" aria-label="Website">🌐</a>` : ''}
    `;

    // Build modal html
    const modalHTML = `
      <div class="modal-wrapper">
        <div class="modal-left">
          <img src="${imageUrl}" alt="${person.name || 'No name'}" onerror="this.onerror=null;this.src='${FALLBACK_IMG}'" />
          <h2>${person.name || '—'}</h2>
          <p>${person.office || person.position || ''}</p>
          <p>${person.state || ''}${person.party ? ', ' + person.party : ''}</p>
          <p>${contactIcons}</p>
          ${link ? `<p><a href="${link}" target="_blank" rel="noopener noreferrer">External Profile</a></p>` : ''}
        </div>
        <div class="modal-right">
          ${person.bio ? `<p><strong>Bio:</strong> ${person.bio}</p>` : ''}
          ${person.education ? `<p><strong>Education:</strong> ${person.education}</p>` : ''}
          ${person.endorsements ? `<p><strong>Endorsements:</strong> ${person.endorsements}</p>` : ''}
          ${person.platform ? `<p><strong>Platform:</strong> ${person.platform}</p>` : ''}
          ${followThroughHTML}
          ${person.proposals ? `<div class="card-subsection"><h4>Legislative Proposals</h4><p>${person.proposals}</p></div>` : ''}
          ${billsHTML}
          ${pollingHTML}
          ${person.vetoes ? `<p><strong>Vetoes:</strong> ${person.vetoes}</p>` : ''}
          ${person.salary ? `<p><strong>Salary:</strong> ${person.salary}</p>` : ''}
          ${person.predecessor ? `<p><strong>Predecessor:</strong> ${person.predecessor}</p>` : ''}
          ${person.donationLink ? `<p><strong>Donate:</strong> <a href="${person.donationLink}" target="_blank" rel="noopener noreferrer">Donate</a></p>` : ''}
          <p><button id="modal-close-btn">Close</button></p>
        </div>
      </div>
    `;

    modalContent.innerHTML = modalHTML;
    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.style.display = 'flex';

    const closeBtn = document.getElementById('modal-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
  }

  // ----- Close modal -----
  function closeModal() {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.style.display = 'none';
    const modalContent = document.getElementById('modal-content');
    if (modalContent) modalContent.innerHTML = '';
  }

  // ----- My Officials (state) ----- (DO NOT exclude Lt. Governors)
  function renderMyOfficials(state) {
    if (!state) return;
    const matches = allOfficials.filter(person => {
      const stateMatch = (person.state === state) || (person.stateName === state) || (person.stateAbbreviation === state);
      return !!stateMatch;
    });

    // sort by office for predictable order (Governor, Lt Governor, Senator, Representative)
    const order = ['Governor', 'Lieutenant', 'Lt', 'Senator', 'Representative', 'Mayor'];
    matches.sort((a, b) => {
      const ai = order.findIndex(k => (a.office || '').includes(k)) || 99;
      const bi = order.findIndex(k => (b.office || '').includes(k)) || 99;
      return ai - bi;
    });

    renderCards(matches, 'my-cards');
  }

  // ----- Lt Governors render (optional separate showcase) -----
  function renderLtGovernors(data) {
    const container = document.getElementById('lt-governors-container');
    if (!container) return;
    container.innerHTML = '';
    (data || []).forEach(gov => {
      const el = document.createElement('div');
      el.className = 'card';
      el.innerHTML = `
        <h3>${gov.name}</h3>
        <p>${gov.state}</p>
        <img src="${(gov.photo || FALLBACK_IMG)}" alt="${gov.name}" onerror="this.onerror=null;this.src='${FALLBACK_IMG}'" />
      `;
      container.appendChild(el);
    });
  }

  // ----- Rankings & Rookies -----
  function renderRankings() {
    const governors = allOfficials.filter(p => (p.office || '').includes("Governor") && !(p.office || '').toLowerCase().includes("lieutenant"));
    const ltGovernors = allOfficials.filter(p => (p.office || '').toLowerCase().includes("lieutenant") || (p.office || '').includes("LtGovernor") || (p.office || '').includes("Lt. Governor"));
    const senators = allOfficials.filter(p => (p.office || '').includes("Senator"));
    const house = allOfficials.filter(p => (p.office || '').includes("Representative") || (p.office || '').includes("House"));

    renderCards(governors, 'rankings-governors');
    renderCards(ltGovernors, 'rankings-ltgovernors');
    renderCards(senators, 'rankings-senators');
    renderCards(house, 'rankings-house');
  }

  function renderRookies() {
    const cutoffYear = new Date().getFullYear() - 6;
    const rookieGovernors = allOfficials.filter(p => (p.office || '').includes("Governor") && Number(p.termStart) >= cutoffYear);
    const rookieLtGovernors = allOfficials.filter(p => ((p.office || '').toLowerCase().includes("lieutenant") || (p.office || '').includes("LtGovernor")) && Number(p.termStart) >= cutoffYear);
    const rookieSenators = allOfficials.filter(p => (p.office || '').includes("Senator") && Number(p.termStart) >= cutoffYear);
    const rookieHouse = allOfficials.filter(p => ((p.office || '').includes("Representative") || (p.office || '').includes("House")) && Number(p.termStart) >= cutoffYear);

    renderCards(rookieGovernors, 'rookie-governors');
    renderCards(rookieLtGovernors, 'rookie-ltgovernors');
    renderCards(rookieSenators, 'rookie-senators');
    renderCards(rookieHouse, 'rookie-house');
  }

  // ----- Compare dropdowns -----
  function populateCompareDropdowns() {
    const left = document.getElementById('compare-left');
    const right = document.getElementById('compare-right');
    if (!left || !right) return;

    left.innerHTML = '<option value="">Select official A</option>';
    right.innerHTML = '<option value="">Select official B</option>';

    allOfficials.forEach(person => {
      const label = `${person.name} (${person.state || ''}${person.party ? ', ' + person.party : ''})`;
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

    const imageUrl = (person.photo || FALLBACK_IMG);
    const link = person.ballotpediaLink || (person.contact && person.contact.website);

    container.innerHTML = `
      <div class="card">
        <img src="${imageUrl}" alt="${person.name}" onerror="this.onerror=null;this.src='${FALLBACK_IMG}'" />
        <h3>${person.name}</h3>
        <p><strong>Office:</strong> ${person.office || person.position || ''}</p>
        <p><strong>State:</strong> ${person.state}</p>
        <p><strong>Party:</strong> ${person.party || '—'}</p>
        <p><strong>Term:</strong> ${person.termStart || '—'} to ${person.termEnd || '—'}</p>
        ${link ? `<p><a href="${link}" target="_blank" rel="noopener noreferrer">External Profile</a></p>` : ''}
      </div>
    `;
  }

  // ----- Data loading: loads all JSONs and merges into allOfficials -----
  async function loadData() {
    try {
      // These paths assume script runs from the same folder as the JSON files (Common case when index.html is in public/)
      const governors = await safeFetchJson('Governors.json');
      const senate = await safeFetchJson('Senate.json');
      const house = await safeFetchJson('House.json'); // if you have a House.json
      // Lt Governors file is important
      const ltGovernors = await safeFetchJson('LtGovernors.json');

      // If there's also a cleanHouse injection script that sets window.cleanedHouse, incorporate it
      const cleanedHouse = (window.cleanedHouse && Array.isArray(window.cleanedHouse)) ? window.cleanedHouse : house || [];

      // Merge all; ensure unique slugs (if duplicates, prefer existing order)
      const merged = [...(governors || []), ...(senate || []), ...(cleanedHouse || []), ...(ltGovernors || [])];

      // Normalize slugs (lowercase, replace spaces)
      merged.forEach(p => {
        if (!p.slug && p.name) {
          p.slug = (p.name || '').toLowerCase().replace(/[^\w\-]+/g, '-').replace(/\-+/g, '-').replace(/(^-|-?$)/g, '');
        }
      });

      // Save global
      allOfficials = merged;
      window.allOfficials = allOfficials; // keep for backward compatibility

      // Populate UI
      populateCompareDropdowns();
      renderRankings();
      renderRookies();
      renderLtGovernors(ltGovernors || []);

      // State select
      const stateSelect = document.getElementById('state-select');
      if (stateSelect) {
        const states = [...new Set(allOfficials.map(p => p.state).filter(Boolean))].sort();
        stateSelect.innerHTML = '<option value="">Choose a state</option>' + states.map(s => `<option value="${s}">${s}</option>`).join('');
        // default to Alabama if present, else first state
        stateSelect.value = states.includes('Alabama') ? 'Alabama' : (states[0] || '');
        const defaultState = stateSelect.value || 'Alabama';
        renderMyOfficials(defaultState);
        renderCalendar(calendarEvents, defaultState);
        renderVotingInfo(defaultState);

        stateSelect.addEventListener('change', (e) => {
          const selected = e.target.value;
          renderMyOfficials(selected);
          renderCalendar(calendarEvents, selected);
          renderVotingInfo(selected);
        });
      } else {
        // no state-select, fallback to Alabama
        renderMyOfficials('Alabama');
        renderCalendar(calendarEvents, 'Alabama');
        renderVotingInfo('Alabama');
      }

      console.info('Cleaned and parsed:', allOfficials.length, 'entries');
    } catch (err) {
      console.error('loadData error', err);
    }
  }

  // ----- Wait for window.cleanedHouse if other script supplies it; else just continue after small wait -----
  function waitForHouseData() {
    return new Promise(resolve => {
      const maxWait = 3000; // 3s
      const start = Date.now();
      const check = () => {
        if (window.cleanedHouse && Array.isArray(window.cleanedHouse)) {
          resolve();
        } else if (Date.now() - start > maxWait) {
          resolve();
        } else {
          setTimeout(check, 50);
        }
      };
      check();
    });
  }

  // ----- DOM ready boot ----- 
  document.addEventListener('DOMContentLoaded', async function () {
    await waitForHouseData();
    await loadData();

    // Search logic
    const search = document.getElementById('search');
    const results = document.getElementById('results');
    if (search) {
      search.addEventListener('input', (e) => {
        const q = (e.target.value || '').toLowerCase().trim();
        if (!q) {
          if (results) results.innerHTML = '';
          return;
        }
        const matches = (allOfficials || []).filter(p =>
          (p.name || '').toLowerCase().includes(q) ||
          (p.state || '').toLowerCase().includes(q) ||
          (p.party || '').toLowerCase().includes(q)
        );
        const html = matches.map(p => {
          const label = `${p.name} (${p.state}${p.party ? ', ' + p.party : ''})`;
          const link = p.ballotpediaLink || (p.contact && p.contact.website);
          return link ? `<li><a href="${link}" target="_blank" rel="noopener noreferrer">${label}</a></li>` : `<li>${label}</li>`;
        }).join('');
        if (results) results.innerHTML = html || `<li>No matches for "${q}"</li>`;
      });
    }

    // Tab buttons wiring
    document.querySelectorAll('.tab-button').forEach(btn => {
      btn.addEventListener('click', () => {
        const tabId = btn.getAttribute('data-tab');
        document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        window.showTab(tabId);
      });
    });

    // Default active tab
    if (!document.querySelector('.tab-button.active')) {
      const first = document.querySelector('.tab-button');
      if (first) {
        first.classList.add('active');
        window.showTab(first.getAttribute('data-tab'));
      }
    }

    // Modal overlay click-closer
    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });
  });

  // Expose for debugging in console
  window.getApprovalPercent = getApprovalPercent;
})();
