document.addEventListener('DOMContentLoaded', () => {
  console.log('✅ script-v2.js loaded');

  // DOM references
  const stateSelect = document.getElementById('state-select');
  const searchInput = document.getElementById('search');
  const resultsList = document.getElementById('results');
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');

  // Global data store
  window.allOfficials = [];
  // Load data from JSON files
  async function loadData() {
    try {
      const [govRes, senRes, houseRes] = await Promise.all([
        fetch('Governors.json'),
        fetch('Senate.json'),
        fetch('House.json')
      ]);

      const [governors, senate, house] = await Promise.all([
        govRes.json(),
        senRes.json(),
        houseRes.json()
      ]);

      window.allOfficials = [...governors, ...senate, ...house];
      console.log(`✅ Loaded ${window.allOfficials.length} officials`);
    } catch (err) {
      console.error('❌ Failed to load data:', err);
    }
  }
  // State dropdown logic
  if (stateSelect && resultsList) {
    stateSelect.addEventListener('change', () => {
      const selectedState = stateSelect.value;
      const filtered = window.allOfficials.filter(off => off.state === selectedState);

      resultsList.innerHTML = '';

      filtered.forEach(off => {
        const li = document.createElement('li');
        li.textContent = `${off.name} (${off.party})`;
        resultsList.appendChild(li);
      });

      attachModalListeners();
    });
  }
  // Search bar logic
  if (searchInput && resultsList) {
    searchInput.addEventListener('input', function () {
      const query = this.value.toLowerCase();
      const matches = window.allOfficials.filter(off =>
        off.name.toLowerCase().includes(query) ||
        off.state.toLowerCase().includes(query) ||
        off.party.toLowerCase().includes(query)
      );

      resultsList.innerHTML = '';

      matches.forEach(match => {
        const li = document.createElement('li');
        li.textContent = `${match.name} (${match.state}, ${match.party})`;
        resultsList.appendChild(li);
      });

      attachModalListeners();
    });
  }
  // Tab switching logic
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tab = button.getAttribute('data-tab');

      tabContents.forEach(content => {
        content.style.display = content.id === tab ? 'block' : 'none';
      });

      tabButtons.forEach(btn => {
        btn.classList.toggle('active', btn === button);
      });
    });
  });

  // Default tab activation
  document.querySelector('.tab-button[data-tab="overview"]')?.click();
  // Modal rendering logic
  function renderModal(official) {
    const modal = document.getElementById('modal');
    const modalContent = document.getElementById('modal-content');

    if (!modal || !modalContent) return;

    modalContent.innerHTML = `
      <h2>${official.name}</h2>
      <p><strong>State:</strong> ${official.state}</p>
      <p><strong>Party:</strong> ${official.party}</p>
      <p><strong>Office:</strong> ${official.office || 'N/A'}</p>
      <p><strong>Phone:</strong> ${official.phone || 'N/A'}</p>
      <p><strong>Email:</strong> ${official.email || 'N/A'}</p>
      <p><strong>Website:</strong> <a href="${official.website}" target="_blank">${official.website}</a></p>
    `;

    modal.style.display = 'block';
  }

  // Close modal logic
  document.getElementById('modal-close')?.addEventListener('click', () => {
    const modal = document.getElementById('modal');
    if (modal) modal.style.display = 'none';
  });

  // Click-to-open logic (attach to results)
  function attachModalListeners() {
    const resultsList = document.getElementById('results');
    if (!resultsList) return;

    resultsList.querySelectorAll('li').forEach(li => {
      li.addEventListener('click', () => {
        const name = li.textContent.split('(')[0].trim();
        const match = window.allOfficials.find(off => off.name === name);
        if (match) renderModal(match);
      });
    });
  }
  // Kick off data load
  loadData();
});
  // Photo enrichment logic
  function getPhotoUrl(official) {
    if (official.photo && official.photo.trim() !== '') {
      return official.photo;
    }
    // Fallback image
    return 'fallback.jpg'; // Replace with your actual fallback image path
  }
  // Upgrade modal to show photo
  function renderModal(official) {
    const modal = document.getElementById('modal');
    const modalContent = document.getElementById('modal-content');

    if (!modal || !modalContent) return;

    const photoUrl = getPhotoUrl(official);

    modalContent.innerHTML = `
      <img src="${photoUrl}" alt="${official.name}" style="max-width:150px; border-radius:8px; margin-bottom:10px;">
      <h2>${official.name}</h2>
      <p><strong>State:</strong> ${official.state}</p>
      <p><strong>Party:</strong> ${official.party}</p>
      <p><strong>Office:</strong> ${official.office || 'N/A'}</p>
      <p><strong>Phone:</strong> ${official.phone || 'N/A'}</p>
      <p><strong>Email:</strong> ${official.email || 'N/A'}</p>
      <p><strong>Website:</strong> <a href="${official.website}" target="_blank">${official.website}</a></p>
    `;

    modal.style.display = 'block';
  }
  // Calendar tab logic
  async function loadCalendar(state) {
    const calendarList = document.getElementById('calendar-list');
    if (!calendarList) return;

    try {
      const res = await fetch(`calendar/${state}.json`);
      const events = await res.json();

      calendarList.innerHTML = '';

      events.forEach(event => {
        const li = document.createElement('li');
        li.innerHTML = `
          <strong>${event.date}</strong>: ${event.title}<br>
          <em>${event.location || 'Location TBD'}</em>
        `;
        calendarList.appendChild(li);
      });

      console.log(`📅 Loaded ${events.length} events for ${state}`);
    } catch (err) {
      console.error(`❌ Failed to load calendar for ${state}:`, err);
      calendarList.innerHTML = '<li>No events found.</li>';
    }
  }

  // Trigger calendar load on tab switch
  document.querySelector('.tab-button[data-tab="calendar"]')?.addEventListener('click', () => {
    const selectedState = stateSelect?.value || 'AL';
    loadCalendar(selectedState);
  });
  // Voting & Registration tab logic
  async function loadVotingInfo(state) {
    const votingBox = document.getElementById('voting-box');
    if (!votingBox) return;

    try {
      const res = await fetch(`voting/${state}.json`);
      const info = await res.json();

      votingBox.innerHTML = `
        <h3>Register to Vote</h3>
        <p>${info.register || 'Registration info not available.'}</p>

        <h3>Vote by Mail</h3>
        <p>${info.mail || 'Mail-in voting info not available.'}</p>

        <h3>Election Day</h3>
        <p>${info.election || 'Election day info not available.'}</p>
      `;

      console.log(`🗳️ Loaded voting info for ${state}`);
    } catch (err) {
      console.error(`❌ Failed to load voting info for ${state}:`, err);
      votingBox.innerHTML = '<p>Voting information not available.</p>';
    }
  }

  // Trigger voting info load on tab switch
  document.querySelector('.tab-button[data-tab="voting"]')?.addEventListener('click', () => {
    const selectedState = stateSelect?.value || 'AL';
    loadVotingInfo(selectedState);
  });
  // Stat logic and rookie tracking
  function renderStats() {
    const statsBox = document.getElementById('stats-box');
    if (!statsBox || !window.allOfficials.length) return;

    const total = window.allOfficials.length;
    const governors = window.allOfficials.filter(off => off.office === 'Governor').length;
    const rookies = window.allOfficials.filter(off => off.rookie === true).length;
    const parties = {};

    window.allOfficials.forEach(off => {
      const party = off.party || 'Unknown';
      parties[party] = (parties[party] || 0) + 1;
    });

    statsBox.innerHTML = `
      <h3>Totals</h3>
      <p><strong>All Officials:</strong> ${total}</p>
      <p><strong>Governors:</strong> ${governors}</p>
      <p><strong>Rookies:</strong> ${rookies}</p>

      <h3>Party Breakdown</h3>
      <ul>
        ${Object.entries(parties).map(([party, count]) => `<li>${party}: ${count}</li>`).join('')}
      </ul>
    `;

    console.log('📊 Stats rendered');
  }

  // Trigger stat rendering on tab switch
  document.querySelector('.tab-button[data-tab="stats"]')?.addEventListener('click', () => {
    renderStats();
  });
  // UI polish and iconography
  function injectPartyIcon(party) {
    switch (party) {
      case 'Democrat':
        return '🔵';
      case 'Republican':
        return '🔴';
      case 'Independent':
        return '⚪';
      default:
        return '❔';
    }
  }

  // Upgrade result rendering with icons
  function renderResultItem(official) {
    const li = document.createElement('li');
    const icon = injectPartyIcon(official.party);
    li.innerHTML = `${icon} ${official.name} (${official.state}, ${official.party})`;
    return li;
  }
  // Refactor state dropdown rendering
  if (stateSelect && resultsList) {
    stateSelect.addEventListener('change', () => {
      const selectedState = stateSelect.value;
      const filtered = window.allOfficials.filter(off => off.state === selectedState);

      resultsList.innerHTML = '';
      filtered.forEach(off => {
        const li = renderResultItem(off);
        resultsList.appendChild(li);
      });

      attachModalListeners();
    });
  }

  // Refactor search rendering
  if (searchInput && resultsList) {
    searchInput.addEventListener('input', function () {
      const query = this.value.toLowerCase();
      const matches = window.allOfficials.filter(off =>
        off.name.toLowerCase().includes(query) ||
        off.state.toLowerCase().includes(query) ||
        off.party.toLowerCase().includes(query)
      );

      resultsList.innerHTML = '';
      matches.forEach(match => {
        const li = renderResultItem(match);
        resultsList.appendChild(li);
      });

      attachModalListeners();
    });
  }
  // Fallback guards for missing elements
  if (!stateSelect) console.warn('⚠️ Missing #state-select');
  if (!searchInput) console.warn('⚠️ Missing #search');
  if (!resultsList) console.warn('⚠️ Missing #results');
  if (!tabButtons.length) console.warn('⚠️ No .tab-button elements found');
  if (!tabContents.length) console.warn('⚠️ No .tab-content elements found');

  // Modular cleanup hooks (optional future use)
  window.resetResults = () => {
    if (resultsList) resultsList.innerHTML = '';
  };

  window.getOfficialsByState = (state) => {
    return window.allOfficials.filter(off => off.state === state);
  };

  window.getRookies = () => {
    return window.allOfficials.filter(off => off.rookie === true);
  };
  // Modal expansion: bills signed + platform promises
  function renderModal(official) {
    const modal = document.getElementById('modal');
    const modalContent = document.getElementById('modal-content');
    if (!modal || !modalContent) return;

    const photoUrl = getPhotoUrl(official);
    const bills = official.bills?.filter(b => b.link?.includes('legiscan.com')) || [];
    const promises = official.promises || [];

    modalContent.innerHTML = `
      <img src="${photoUrl}" alt="${official.name}" style="max-width:150px; border-radius:8px; margin-bottom:10px;">
      <h2>${official.name}</h2>
      <p><strong>State:</strong> ${official.state}</p>
      <p><strong>Party:</strong> ${official.party}</p>
      <p><strong>Office:</strong> ${official.office || 'N/A'}</p>
      <p><strong>Phone:</strong> ${official.phone || 'N/A'}</p>
      <p><strong>Email:</strong> ${official.email || 'N/A'}</p>
      <p><strong>Website:</strong> <a href="${official.website}" target="_blank">${official.website}</a></p>

      ${bills.length ? `
        <h3>Bills Signed</h3>
        <ul>${bills.map(b => `<li><a href="${b.link}" target="_blank">${b.title}</a></li>`).join('')}</ul>
      ` : ''}

      ${promises.length ? `
        <h3>Platform Promises</h3>
        <ul>${promises.map(p => `<li>${p}</li>`).join('')}</ul>
      ` : ''}
    `;

    modal.style.display = 'block';
  }
  // Highlight rookies visually
  function renderResultItem(official) {
    const li = document.createElement('li');
    const icon = injectPartyIcon(official.party);
    const rookieTag = official.rookie ? '🌟 Rookie' : '';
    li.innerHTML = `${icon} ${official.name} (${official.state}, ${official.party}) ${rookieTag}`;
    return li;
  }

  // Stat-driven filter: show only rookies
  const rookieButton = document.getElementById('filter-rookies');
  if (rookieButton && resultsList) {
    rookieButton.addEventListener('click', () => {
      const rookies = window.getRookies();
      resultsList.innerHTML = '';
      rookies.forEach(off => {
        const li = renderResultItem(off);
        resultsList.appendChild(li);
      });
      attachModalListeners();
    });
  }
  // Upgrade modal contact info to be clickable
  function renderModal(official) {
    const modal = document.getElementById('modal');
    const modalContent = document.getElementById('modal-content');
    if (!modal || !modalContent) return;

    const photoUrl = getPhotoUrl(official);
    const bills = official.bills?.filter(b => b.link?.includes('legiscan.com')) || [];
    const promises = official.promises || [];

    const phoneLink = official.phone ? `<a href="tel:${official.phone}">${official.phone}</a>` : 'N/A';
    const emailLink = official.email ? `<a href="mailto:${official.email}">${official.email}</a>` : 'N/A';
    const websiteLink = official.website ? `<a href="${official.website}" target="_blank">${official.website}</a>` : 'N/A';

    modalContent.innerHTML = `
      <img src="${photoUrl}" alt="${official.name}" style="max-width:150px; border-radius:8px; margin-bottom:10px;">
      <h2>${official.name}</h2>
      <p><strong>State:</strong> ${official.state}</p>
      <p><strong>Party:</strong> ${official.party}</p>
      <p><strong>Office:</strong> ${official.office || 'N/A'}</p>
      <p><strong>Phone:</strong> ${phoneLink}</p>
      <p><strong>Email:</strong> ${emailLink}</p>
      <p><strong>Website:</strong> ${websiteLink}</p>

      ${bills.length ? `
        <h3>Bills Signed</h3>
        <ul>${bills.map(b => `<li><a href="${b.link}" target="_blank">${b.title}</a></li>`).join('')}</ul>
      ` : ''}

      ${promises.length ? `
        <h3>Platform Promises</h3>
        <ul>${promises.map(p => `<li>${p}</li>`).join('')}</ul>
      ` : ''}
    `;

    modal.style.display = 'block';
  }
  // Tabbed modal sections
  function renderModal(official) {
    const modal = document.getElementById('modal');
    const modalContent = document.getElementById('modal-content');
    if (!modal || !modalContent) return;

    const photoUrl = getPhotoUrl(official);
    const bills = official.bills?.filter(b => b.link?.includes('legiscan.com')) || [];
    const promises = official.promises || [];

    modalContent.innerHTML = `
      <div style="text-align:center;">
        <img src="${photoUrl}" alt="${official.name}" style="max-width:150px; border-radius:8px; margin-bottom:10px;">
        <h2>${official.name}</h2>
      </div>

      <div class="modal-tabs">
        <button class="modal-tab active" data-tab="overview">Overview</button>
        ${bills.length ? `<button class="modal-tab" data-tab="bills">Bills</button>` : ''}
        ${promises.length ? `<button class="modal-tab" data-tab="promises">Promises</button>` : ''}
      </div>

      <div class="modal-section" id="modal-overview">
        <p><strong>State:</strong> ${official.state}</p>
        <p><strong>Party:</strong> ${official.party}</p>
        <p><strong>Office:</strong> ${official.office || 'N/A'}</p>
        <p><strong>Phone:</strong> <a href="tel:${official.phone}">${official.phone || 'N/A'}</a></p>
        <p><strong>Email:</strong> <a href="mailto:${official.email}">${official.email || 'N/A'}</a></p>
        <p><strong>Website:</strong> <a href="${official.website}" target="_blank">${official.website || 'N/A'}</a></p>
      </div>

      ${bills.length ? `
        <div class="modal-section" id="modal-bills" style="display:none;">
          <h3>Bills Signed</h3>
          <ul>${bills.map(b => `<li><a href="${b.link}" target="_blank">${b.title}</a></li>`).join('')}</ul>
        </div>
      ` : ''}

      ${promises.length ? `
        <div class="modal-section" id="modal-promises" style="display:none;">
          <h3>Platform Promises</h3>
          <ul>${promises.map(p => `<li>${p}</li>`).join('')}</ul>
        </div>
      ` : ''}
    `;

    modal.style.display = 'block';

    // Tab switching logic
    modalContent.querySelectorAll('.modal-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.getAttribute('data-tab');
        modalContent.querySelectorAll('.modal-section').forEach(section => {
          section.style.display = section.id === `modal-${target}` ? 'block' : 'none';
        });
        modalContent.querySelectorAll('.modal-tab').forEach(btn => {
          btn.classList.toggle('active', btn === tab);
        });
      });
    });
  }
