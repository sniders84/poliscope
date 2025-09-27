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
  // UX: Escape key closes modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const modal = document.getElementById('modal');
      if (modal) modal.style.display = 'none';
    }
  });

  // UX: Auto-focus search input on page load
  if (searchInput) {
    searchInput.focus();
  }
  // Sort officials alphabetically by name
  function sortByName(list) {
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }

  // Sort officials with rookies first
  function sortByRookie(list) {
    return [...list].sort((a, b) => {
      if (a.rookie === b.rookie) return a.name.localeCompare(b.name);
      return a.rookie ? -1 : 1;
    });
  }

  // Example usage in search or state dropdown
  // const sorted = sortByName(filtered);
  // const sorted = sortByRookie(filtered);
  // Debounce logic for search input
  function debounce(fn, delay) {
    let timer = null;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  // Replace search input listener with debounced version
  if (searchInput && resultsList) {
    searchInput.addEventListener('input', debounce(function () {
      const query = this.value.toLowerCase();
      const matches = window.allOfficials.filter(off =>
        off.name.toLowerCase().includes(query) ||
        off.state.toLowerCase().includes(query) ||
        off.party.toLowerCase().includes(query)
      );

      resultsList.innerHTML = '';
      sortByName(matches).forEach(match => {
        const li = renderResultItem(match);
        resultsList.appendChild(li);
      });

      attachModalListeners();
    }, 200)); // 200ms delay
  }
  // Clear search and restore full list
  const clearButton = document.getElementById('clear-search');
  if (clearButton && resultsList && searchInput) {
    clearButton.addEventListener('click', () => {
      searchInput.value = '';
      const sorted = sortByName(window.allOfficials);
      resultsList.innerHTML = '';
      sorted.forEach(off => {
        const li = renderResultItem(off);
        resultsList.appendChild(li);
      });
      attachModalListeners();
    });
  }
  // Filter: Show only Governors
  const govButton = document.getElementById('filter-governors');
  if (govButton && resultsList) {
    govButton.addEventListener('click', () => {
      const governors = window.allOfficials.filter(off => off.office === 'Governor');
      const sorted = sortByName(governors);
      resultsList.innerHTML = '';
      sorted.forEach(off => {
        const li = renderResultItem(off);
        resultsList.appendChild(li);
      });
      attachModalListeners();
    });
  }
  // Update tab and filter counts
  function updateCounts() {
    const statsTab = document.querySelector('.tab-button[data-tab="stats"]');
    const rookieBtn = document.getElementById('filter-rookies');
    const govBtn = document.getElementById('filter-governors');

    if (statsTab) {
      const total = window.allOfficials.length;
      statsTab.textContent = `Stats (${total})`;
    }

    if (rookieBtn) {
      const rookies = window.getRookies().length;
      rookieBtn.textContent = `Rookies (${rookies})`;
    }

    if (govBtn) {
      const governors = window.allOfficials.filter(off => off.office === 'Governor').length;
      govBtn.textContent = `Governors (${governors})`;
    }
  }

  // Run once on load
  updateCounts();
  // Fuzzy match helper
  function fuzzyMatch(text, query) {
    return text.toLowerCase().includes(query);
  }

  // Replace search logic with fuzzy matching
  if (searchInput && resultsList) {
    searchInput.addEventListener('input', debounce(function () {
      const query = this.value.trim().toLowerCase();
      const matches = window.allOfficials.filter(off =>
        fuzzyMatch(off.name, query) ||
        fuzzyMatch(off.state, query) ||
        fuzzyMatch(off.party, query) ||
        fuzzyMatch(off.office || '', query)
      );

      resultsList.innerHTML = '';
      sortByName(matches).forEach(match => {
        const li = renderResultItem(match);
        resultsList.append  // Filter by party tag
  function filterByParty(party) {
    const matches = window.allOfficials.filter(off => off.party === party);
    const sorted = sortByName(matches);
    resultsList.innerHTML = '';
    sorted.forEach(off => {
      const li = renderResultItem(off);
      resultsList.appendChild(li);
    });
    attachModalListeners();
  }

  // Wire party buttons
  const demBtn = document.getElementById('filter-democrat');
  const repBtn = document.getElementById('filter-republican');
  const indBtn = document.getElementById('filter-independent');

  if (demBtn) demBtn.addEventListener('click', () => filterByParty('Democrat'));
  if (repBtn) repBtn.addEventListener('click', () => filterByParty('Republican'));
  if (indBtn) indBtn.addEventListener('click', () => filterByParty('Independent'));
  // Show all officials
  const showAllButton = document.getElementById('show-all');
  if (showAllButton && resultsList) {
    showAllButton.addEventListener('click', () => {
      const sorted = sortByName(window.allOfficials);
      resultsList.innerHTML = '';
      sorted.forEach(off => {
        const li = renderResultItem(off);
        resultsList.appendChild(li);
      });
      attachModalListeners();
    });
  }
  // Spotlight: Show one random official
  const randomButton = document.getElementById('show-random');
  if (randomButton && resultsList) {
    randomButton.addEventListener('click', () => {
      const pool = window.allOfficials;
      const pick = pool[Math.floor(Math.random() * pool.length)];
      resultsList.innerHTML = '';
      const li = renderResultItem(pick);
      resultsList.appendChild(li);
      attachModalListeners();
    });
  }
  // Spotlight of the Day (rotates daily)
  const spotlightButton = document.getElementById('spotlight-today');
  if (spotlightButton && resultsList) {
    spotlightButton.addEventListener('click', () => {
      const pool = window.allOfficials;
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      const seed = today.split('-').join('');
      const index = parseInt(seed, 10) % pool.length;
      const pick = pool[index];

      resultsList.innerHTML = '';
      const li = renderResultItem(pick);
      resultsList.appendChild(li);
      attachModalListeners();
    });
  }
  // Filter: Recently added officials
  const recentButton = document.getElementById('filter-recent');
  if (recentButton && resultsList) {
    recentButton.addEventListener('click', () => {
      const recent = window.allOfficials.filter(off => {
        const added = new Date(off.timestamp || off.batch || 0);
        const daysAgo = (Date.now() - added.getTime()) / (1000 * 60 * 60 * 24);
        return daysAgo <= 7; // added within last 7 days
      });

      const sorted = sortByName(recent);
      resultsList.innerHTML = '';
      sorted.forEach(off => {
        const li = renderResultItem(off);
        resultsList.appendChild(li);
      });

      attachModalListeners();
    });
  }
  // Filter by batch tag or import source
  function filterByBatch(tag) {
    const matches = window.allOfficials.filter(off => (off.batch || off.source || '').includes(tag));
    const sorted = sortByName(matches);
    resultsList.innerHTML = '';
    sorted.forEach(off => {
      const li = renderResultItem(off);
      resultsList.appendChild(li);
    });
    attachModalListeners();
  }

  // Wire batch buttons
  const houseBtn = document.getElementById('filter-house');
  const manualBtn = document.getElementById('filter-manual');

  if (houseBtn) houseBtn.addEventListener('click', () => filterByBatch('House'));
  if (manualBtn) manualBtn.addEventListener('click', () => filterByBatch('Manual'));
  // Filter: Verified officials only
  const verifiedButton = document.getElementById('filter-verified');
  if (verifiedButton && resultsList) {
    verifiedButton.addEventListener('click', () => {
      const verified = window.allOfficials.filter(off => off.verified === true);
      const sorted = sortByName(verified);
      resultsList.innerHTML = '';
      sorted.forEach(off => {
        const li = renderResultItem(off);
        resultsList.appendChild(li);
      });
      attachModalListeners();
    });
  }
  // Filter: Officials missing photo
  const missingPhotoButton = document.getElementById('filter-missing-photo');
  if (missingPhotoButton && resultsList) {
    missingPhotoButton.addEventListener('click', () => {
      const missing = window.allOfficials.filter(off => {
        const url = getPhotoUrl(off);
        return !url || url.includes('placeholder') || url.includes('default');
      });

      const sorted = sortByName(missing);
      resultsList.innerHTML = '';
      sorted.forEach(off => {
        const li = renderResultItem(off);
        resultsList.appendChild(li);
      });

      attachModalListeners();
    });
  }
  // Filter: Officials missing key enrichment
  const needsEnrichmentButton = document.getElementById('filter-needs-enrichment');
  if (needsEnrichmentButton && resultsList) {
    needsEnrichmentButton.addEventListener('click', () => {
      const unenriched = window.allOfficials.filter(off => {
        const hasBills = Array.isArray(off.bills) && off.bills.some(b => b.link?.includes('legiscan.com'));
        const hasPromises = Array.isArray(off.promises) && off.promises.length > 0;
        return !hasBills || !hasPromises;
      });

      const sorted = sortByName(unenriched);
      resultsList.innerHTML = '';
      sorted.forEach(off => {
        const li = renderResultItem(off);
        resultsList.appendChild(li);
      });

      attachModalListeners();
    });
  }
  // Render stat leaderboard tab
  function renderLeaderboardTab() {
    const leaderboardTab = document.getElementById('leaderboard-tab');
    const leaderboardList = document.getElementById('leaderboard-list');
    if (!leaderboardTab || !leaderboardList) return;

    leaderboardTab.addEventListener('click', () => {
      const sorted = [...window.allOfficials].sort((a, b) => {
        const aScore = (a.views || 0) + (a.clicks || 0) + (a.rookie ? 100 : 0);
        const bScore = (b.views || 0) + (b.clicks || 0) + (b.rookie ? 100 : 0);
        return bScore - aScore;
      });

      leaderboardList.innerHTML = '';
      sorted.forEach(off => {
        const li = document.createElement('li');
        li.innerHTML = `
          <strong>${off.name}</strong> — 
          ${off.views || 0} views, 
          ${off.clicks || 0} clicks 
          ${off.rookie ? '🌟 Rookie' : ''}
        `;
        leaderboardList.appendChild(li);
      });
    });
  }

  // Run once on load
  renderLeaderboardTab();
  // Render batch stats summary
  function renderBatchStats() {
    const statsContainer = document.getElementById('batch-stats');
    if (!statsContainer) return;

    const total = window.allOfficials.length;
    const verified = window.allOfficials.filter(off => off.verified === true).length;
    const withPhotos = window.allOfficials.filter(off => {
      const url = getPhotoUrl(off);
      return url && !url.includes('placeholder') && !url.includes('default');
    }).length;
    const withBills = window.allOfficials.filter(off =>
      Array.isArray(off.bills) && off.bills.some(b => b.link?.includes('legiscan.com'))
    ).length;
    const withPromises = window.allOfficials.filter(off =>
      Array.isArray(off.promises) && off.promises.length > 0
    ).length;

    statsContainer.innerHTML = `
      <ul>
        <li><strong>Total Officials:</strong> ${total}</li>
        <li><strong>Verified:</strong> ${verified}</li>
        <li><strong>With Photos:</strong> ${withPhotos}</li>
        <li><strong>With Bills:</strong> ${withBills}</li>
        <li><strong>With Promises:</strong> ${withPromises}</li>
      </ul>
    `;
  }

  // Run once on load
  renderBatchStats();
  // Render rookie tracker tab
  function renderRookieTab() {
    const rookieTab = document.getElementById('rookie-tab');
    const rookieList = document.getElementById('rookie-list');
    if (!rookieTab || !rookieList) return;

    rookieTab.addEventListener('click', () => {
      const rookies = window.allOfficials.filter(off => off.rookie === true);
      const sorted = [...rookies].sort((a, b) => {
        const aScore = (a.views || 0) + (a.clicks || 0);
        const bScore = (b.views || 0) + (b.clicks || 0);
        return bScore - aScore;
      });

      rookieList.innerHTML = '';
      sorted.forEach(off => {
        const li = document.createElement('li');
        li.innerHTML = `
          <strong>${off.name}</strong> — 
          ${off.views || 0} views, 
          ${off.clicks || 0} clicks
        `;
        rookieList.appendChild(li);
      });
    });
  }

  // Run once on load
  renderRookieTab();
  // Rookie of the Day (rotates daily among rookies)
  const rookieSpotlightButton = document.getElementById('rookie-spotlight');
  if (rookieSpotlightButton && resultsList) {
    rookieSpotlightButton.addEventListener('click', () => {
      const rookies = window.allOfficials.filter(off => off.rookie === true);
      if (!rookies.length) return;

      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      const seed = today.split('-').join('');
      const index = parseInt(seed, 10) % rookies.length;
      const pick = rookies[index];

      resultsList.innerHTML = '';
      const li = renderResultItem(pick);
      resultsList.appendChild(li);
      attachModalListeners();
    });
  }
  // Render Top Rookie tab
  function renderTopRookieTab() {
    const topRookieTab = document.getElementById('top-rookie-tab');
    const topRookieContainer = document.getElementById('top-rookie-container');
    if (!topRookieTab || !topRookieContainer) return;

    topRookieTab.addEventListener('click', () => {
      const rookies = window.allOfficials.filter(off => off.rookie === true);
      if (!rookies.length) return;

      const sorted = [...rookies].sort((a, b) => {
        const aScore = (a.views || 0) + (a.clicks || 0);
        const bScore = (b.views || 0) + (b.clicks || 0);
        return bScore - aScore;
      });

      const top = sorted[0];
      topRookieContainer.innerHTML = `
        <div style="text-align:center; padding:10px;">
          <img src="${getPhotoUrl(top)}" alt="${top.name}" style="max-width:120px; border-radius:8px;">
          <h2>${top.name} <span style="color:gold;">🏅</span></h2>
          <p>${top.views || 0} views, ${top.clicks || 0} clicks</p>
          <p><strong>State:</strong> ${top.state}</p>
          <p><strong>Party:</strong> ${top.party}</p>
        </div>
      `;
    });
  }

  // Run once on load
  renderTopRookieTab();
  // Filter: Rookie Watchlist
  const rookieWatchButton = document.getElementById('rookie-watchlist');
  if (rookieWatchButton && resultsList) {
    rookieWatchButton.addEventListener('click', () => {
      const watchlist = window.allOfficials.filter(off =>
        off.watchlist === true || (off.batch || '').includes('Rookie Watch')
      );

      const sorted = sortByName(watchlist);
      resultsList.innerHTML = '';
      sorted.forEach(off => {
        const li = renderResultItem(off);
        resultsList.appendChild(li);
      });

      attachModalListeners();
    });
  }
  // Pin official to top (persistent via localStorage)
  function pinOfficial(id) {
    localStorage.setItem('pinnedOfficialId', id);
    renderPinnedOfficial();
  }

  function renderPinnedOfficial() {
    const pinnedId = localStorage.getItem('pinnedOfficialId');
    const pinned = window.allOfficials.find(off => off.id === pinnedId);
    const pinnedContainer = document.getElementById('pinned-official');
    if (!pinned || !pinnedContainer) return;

    pinnedContainer.innerHTML = '';
    const li = renderResultItem(pinned);
    pinnedContainer.appendChild(li);
    attachModalListeners();
  }

  // Run once on load
  renderPinnedOfficial();
  // Compare two officials side-by-side
  function renderComparison(offA, offB) {
    const compareContainer = document.getElementById('compare-container');
    if (!compareContainer) return;

    compareContainer.innerHTML = `
      <div style="display:flex; gap:20px; flex-wrap:wrap;">
        <div style="flex:1; min-width:300px;">${renderModalContent(offA)}</div>
        <div style="flex:1; min-width:300px;">${renderModalContent(offB)}</div>
      </div>
    `;
  }

  // Wire compare tab
  const compareTab = document.getElementById('compare-tab');
  if (compareTab) {
    compareTab.addEventListener('click', () => {
      const pool = window.allOfficials;
      if (pool.length < 2) return;
      const [offA, offB] = pool.slice(0, 2); // Replace with smarter selection if needed
      renderComparison(offA, offB);
    });
  }
  // Compare top two officials from selected state
  function renderStateComparison(state) {
    const pool = window.allOfficials.filter(off => off.state === state);
    if (pool.length < 2) return;

    const sorted = [...pool].sort((a, b) => {
      const aScore = (a.views || 0) + (a.clicks || 0);
      const bScore = (b.views || 0) + (b.clicks || 0);
      return bScore - aScore;
    });

    const [offA, offB] = sorted.slice(0, 2);
    renderComparison(offA, offB);
  }

  // Wire compare-by-state tab
  const compareStateTab = document.getElementById('compare-state-tab');
  const compareStateDropdown = document.getElementById('compare-state-select');

  if (compareStateTab && compareStateDropdown) {
    compareStateTab.addEventListener('click', () => {
      const selected = compareStateDropdown.value;
      if (selected) renderStateComparison(selected);
    });
  }
  // Compare top Democrat vs top Republican
  function renderPartyComparison() {
    const dems = window.allOfficials.filter(off => off.party === 'Democrat');
    const reps = window.allOfficials.filter(off => off.party === 'Republican');
    if (!dems.length || !reps.length) return;

    const topDem = [...dems].sort((a, b) => ((b.views || 0) + (b.clicks || 0)) - ((a.views || 0) + (a.clicks || 0)))[0];
    const topRep = [...reps].sort((a, b) => ((b.views || 0) + (b.clicks || 0)) - ((a.views || 0) + (a.clicks || 0)))[0];

    renderComparison(topDem, topRep);
  }

  // Wire compare-by-party tab
  const comparePartyTab = document.getElementById('compare-party-tab');
  if (comparePartyTab) {
    comparePartyTab.addEventListener('click', renderPartyComparison);
  }
  // Compare top rookie vs top veteran
  function renderRookieVsVeteran() {
    const rookies = window.allOfficials.filter(off => off.rookie === true);
    const veterans = window.allOfficials.filter(off => off.rookie !== true);
    if (!rookies.length || !veterans.length) return;

    const topRookie = [...rookies].sort((a, b) => ((b.views || 0) + (b.clicks || 0)) - ((a.views || 0) + (a.clicks || 0)))[0];
    const topVeteran = [...veterans].sort((a, b) => ((b.views || 0) + (b.clicks || 0)) - ((a.views || 0) + (a.clicks || 0)))[0];

    renderComparison(topRookie, topVeteran);
  }

  // Wire compare-by-rookie-status tab
  const compareRookieTab = document.getElementById('compare-rookie-tab');
  if (compareRookieTab) {
    compareRookieTab.addEventListener('click', renderRookieVsVeteran);
  }
  // Compare top two officials by engagement score
  function renderTopEngagementComparison() {
    const sorted = [...window.allOfficials].sort((a, b) => {
      const aScore = (a.views || 0) + (a.clicks || 0);
      const bScore = (b.views || 0) + (b.clicks || 0);
      return bScore - aScore;
    });

    if (sorted.length < 2) return;
    const [offA, offB] = sorted.slice(0, 2);
    renderComparison(offA, offB);
  }

  // Wire compare-by-engagement tab
  const compareEngagementTab = document.getElementById('compare-engagement-tab');
  if (compareEngagementTab) {
    compareEngagementTab.addEventListener('click', renderTopEngagementComparison);
  }
  // Compare two manually selected officials
  function renderCustomComparison() {
    const selectA = document.getElementById('custom-compare-a');
    const selectB = document.getElementById('custom-compare-b');
    if (!selectA || !selectB) return;

    const idA = selectA.value;
    const idB = selectB.value;
    const offA = window.allOfficials.find(off => off.id === idA);
    const offB = window.allOfficials.find(off => off.id === idB);
    if (!offA || !offB) return;

    renderComparison(offA, offB);
  }

  // Wire custom compare tab
  const customCompareBtn = document.getElementById('custom-compare-btn');
  if (customCompareBtn) {
    customCompareBtn.addEventListener('click', renderCustomComparison);
  }

  // Populate dropdowns on load
  function populateCustomCompareDropdowns() {
    const selectA = document.getElementById('custom-compare-a');
    const selectB = document.getElementById('custom-compare-b');
    if (!selectA || !selectB) return;

    window.allOfficials.forEach(off => {
      const optA = document.createElement('option');
      optA.value = off.id;
      optA.textContent = off.name;
      selectA.appendChild(optA);

      const optB = document.createElement('option');
      optB.value = off.id;
      optB.textContent = off.name;
      selectB.appendChild(optB);
    });
  }

  populateCustomCompareDropdowns();
  // Compare two officials with similar promises
  function renderPromiseComparison(keyword) {
    const pool = window.allOfficials.filter(off =>
      Array.isArray(off.promises) &&
      off.promises.some(p => (p.text || '').toLowerCase().includes(keyword.toLowerCase()))
    );

    if (pool.length < 2) return;

    const sorted = [...pool].sort((a, b) => {
      const aScore = (a.views || 0) + (a.clicks || 0);
      const bScore = (b.views || 0) + (b.clicks || 0);
      return bScore - aScore;
    });

    const [offA, offB] = sorted.slice(0, 2);
    renderComparison(offA, offB);
  }

  // Wire compare-by-promise tab
  const comparePromiseBtn = document.getElementById('compare-promise-btn');
  const comparePromiseInput = document.getElementById('compare-promise-keyword');

  if (comparePromiseBtn && comparePromiseInput) {
    comparePromiseBtn.addEventListener('click', () => {
      const keyword = comparePromiseInput.value.trim();
      if (keyword) renderPromiseComparison(keyword);
    });
  }
  // Compare two officials who share a bill keyword
  function renderBillComparison(keyword) {
    const pool = window.allOfficials.filter(off =>
      Array.isArray(off.bills) &&
      off.bills.some(b => (b.title || '').toLowerCase().includes(keyword.toLowerCase()))
    );

    if (pool.length < 2) return;

    const sorted = [...pool].sort((a, b) => {
      const aScore = (a.views || 0) + (a.clicks || 0);
      const bScore = (b.views || 0) + (b.clicks || 0);
      return bScore - aScore;
    });

    const [offA, offB] = sorted.slice(0, 2);
    renderComparison(offA, offB);
  }

  // Wire compare-by-bill tab
  const compareBillBtn = document.getElementById('compare-bill-btn');
  const compareBillInput = document.getElementById('compare-bill-keyword');

  if (compareBillBtn && compareBillInput) {
    compareBillBtn.addEventListener('click', () => {
      const keyword = compareBillInput.value.trim();
      if (keyword) renderBillComparison(keyword);
    });
  }
  // Compare top Democrat vs Republican in selected state
  function renderStatePartyComparison(state) {
    const pool = window.allOfficials.filter(off => off.state === state);
    const dems = pool.filter(off => off.party === 'Democrat');
    const reps = pool.filter(off => off.party === 'Republican');
    if (!dems.length || !reps.length) return;

    const topDem = [...dems].sort((a, b) => ((b.views || 0) + (b.clicks || 0)) - ((a.views || 0) + (a.clicks || 0)))[0];
    const topRep = [...reps].sort((a, b) => ((b.views || 0) + (b.clicks || 0)) - ((a.views || 0) + (a.clicks || 0)))[0];

    renderComparison(topDem, topRep);
  }

  // Wire compare-by-state-party tab
  const compareStatePartyBtn = document.getElementById('compare-state-party-btn');
  const compareStatePartySelect = document.getElementById('compare-state-party-select');

  if (compareStatePartyBtn && compareStatePartySelect) {
    compareStatePartyBtn.addEventListener('click', () => {
      const selected = compareStatePartySelect.value;
      if (selected) renderStatePartyComparison(selected);
    });
  }
  // Compare top rookie Democrat vs rookie Republican
  function renderRookiePartyComparison() {
    const rookies = window.allOfficials.filter(off => off.rookie === true);
    const dems = rookies.filter(off => off.party === 'Democrat');
    const reps = rookies.filter(off => off.party === 'Republican');
    if (!dems.length || !reps.length) return;

    const topDem = [...dems].sort((a, b) => ((b.views || 0) + (b.clicks || 0)) - ((a.views || 0) + (a.clicks || 0)))[0];
    const topRep = [...reps].sort((a, b) => ((b.views || 0) + (b.clicks || 0)) - ((a.views || 0) + (a.clicks || 0)))[0];

    renderComparison(topDem, topRep);
  }

  // Wire compare-by-rookie-party tab
  const compareRookiePartyBtn = document.getElementById('compare-rookie-party-btn');
  if (compareRookiePartyBtn) {
    compareRookiePartyBtn.addEventListener('click', renderRookiePartyComparison);
  }
  // Compare top rookie vs veteran in selected state
  function renderStateRookieComparison(state) {
    const pool = window.allOfficials.filter(off => off.state === state);
    const rookies = pool.filter(off => off.rookie === true);
    const veterans = pool.filter(off => off.rookie !== true);
    if (!rookies.length || !veterans.length) return;

    const topRookie = [...rookies].sort((a, b) => ((b.views || 0) + (b.clicks || 0)) - ((a.views || 0) + (a.clicks || 0)))[0];
    const topVeteran = [...veterans].sort((a, b) => ((b.views || 0) + (b.clicks || 0)) - ((a.views || 0) + (a.clicks || 0)))[0];

    renderComparison(topRookie, topVeteran);
  }

  // Wire compare-by-rookie-state tab
  const compareRookieStateBtn = document.getElementById('compare-rookie-state-btn');
  const compareRookieStateSelect = document.getElementById('compare-rookie-state-select');

  if (compareRookieStateBtn && compareRookieStateSelect) {
    compareRookieStateBtn.addEventListener('click', () => {
      const selected = compareRookieStateSelect.value;
      if (selected) renderStateRookieComparison(selected);
    });
  }
  // Compare two rookie officials with shared promise keyword
  function renderRookiePromiseComparison(keyword) {
    const rookies = window.allOfficials.filter(off => off.rookie === true);
    const pool = rookies.filter(off =>
      Array.isArray(off.promises) &&
      off.promises.some(p => (p.text || '').toLowerCase().includes(keyword.toLowerCase()))
    );

    if (pool.length < 2) return;

    const sorted = [...pool].sort((a, b) => {
      const aScore = (a.views || 0) + (a.clicks || 0);
      const bScore = (b.views || 0) + (b.clicks || 0);
      return bScore - aScore;
    });

    const [offA, offB] = sorted.slice(0, 2);
    renderComparison(offA, offB);
  }

  // Wire compare-by-rookie-promise tab
  const compareRookiePromiseBtn = document.getElementById('compare-rookie-promise-btn');
  const compareRookiePromiseInput = document.getElementById('compare-rookie-promise-keyword');

  if (compareRookiePromiseBtn && compareRookiePromiseInput) {
    compareRookiePromiseBtn.addEventListener('click', () => {
      const keyword = compareRookiePromiseInput.value.trim();
      if (keyword) renderRookiePromiseComparison(keyword);
    });
  }
  // Compare two rookie officials who share a bill keyword
  function renderRookieBillComparison(keyword) {
    const rookies = window.allOfficials.filter(off => off.rookie === true);
    const pool = rookies.filter(off =>
      Array.isArray(off.bills) &&
      off.bills.some(b => (b.title || '').toLowerCase().includes(keyword.toLowerCase()))
    );

    if (pool.length < 2) return;

    const sorted = [...pool].sort((a, b) => {
      const aScore = (a.views || 0) + (a.clicks || 0);
      const bScore = (b.views || 0) + (b.clicks || 0);
      return bScore - aScore;
    });

    const [offA, offB] = sorted.slice(0, 2);
    renderComparison(offA, offB);
  }

  // Wire compare-by-rookie-bill tab
  const compareRookieBillBtn = document.getElementById('compare-rookie-bill-btn');
  const compareRookieBillInput = document.getElementById('compare-rookie-bill-keyword');

  if (compareRookieBillBtn && compareRookieBillInput) {
    compareRookieBillBtn.addEventListener('click', () => {
      const keyword = compareRookieBillInput.value.trim();
      if (keyword) renderRookieBillComparison(keyword);
    });
  }
  // Compare top rookie Democrat vs Republican in selected state
  function renderRookieStatePartyComparison(state) {
    const pool = window.allOfficials.filter(off => off.state === state && off.rookie === true);
    const dems = pool.filter(off => off.party === 'Democrat');
    const reps = pool.filter(off => off.party === 'Republican');
    if (!dems.length || !reps.length) return;

    const topDem = [...dems].sort((a, b) => ((b.views || 0) + (b.clicks || 0)) - ((a.views || 0) + (a.clicks || 0)))[0];
    const topRep = [...reps].sort((a, b) => ((b.views || 0) + (b.clicks || 0)) - ((a.views || 0) + (a.clicks || 0)))[0];

    renderComparison(topDem, topRep);
  }

  // Wire compare-by-rookie-state-party tab
  const compareRookieStatePartyBtn = document.getElementById('compare-rookie-state-party-btn');
  const compareRookieStatePartySelect = document.getElementById('compare-rookie-state-party-select');

  if (compareRookieStatePartyBtn && compareRookieStatePartySelect) {
    compareRookieStatePartyBtn.addEventListener('click', () => {
      const selected = compareRookieStatePartySelect.value;
      if (selected) renderRookieStatePartyComparison(selected);
    });
  }
  // Compare two rookie officials in selected state with shared promise keyword
  function renderRookieStatePromiseComparison(state, keyword) {
    const rookies = window.allOfficials.filter(off => off.state === state && off.rookie === true);
    const pool = rookies.filter(off =>
      Array.isArray(off.promises) &&
      off.promises.some(p => (p.text || '').toLowerCase().includes(keyword.toLowerCase()))
    );

    if (pool.length < 2) return;

    const sorted = [...pool].sort((a, b) => {
      const aScore = (a.views || 0) + (a.clicks || 0);
      const bScore = (b.views || 0) + (b.clicks || 0);
      return bScore - aScore;
    });

    const [offA, offB] = sorted.slice(0, 2);
    renderComparison(offA, offB);
  }

  // Wire compare-by-rookie-state-promise tab
  const compareRookieStatePromiseBtn = document.getElementById('compare-rookie-state-promise-btn');
  const compareRookieStatePromiseSelect = document.getElementById('compare-rookie-state-promise-select');
  const compareRookieStatePromiseInput = document.getElementById('compare-rookie-state-promise-keyword');

  if (compareRookieStatePromiseBtn && compareRookieStatePromiseSelect && compareRookieStatePromiseInput) {
    compareRookieStatePromiseBtn.addEventListener('click', () => {
      const state = compareRookieStatePromiseSelect.value;
      const keyword = compareRookieStatePromiseInput.value.trim();
      if (state && keyword) renderRookieStatePromiseComparison(state, keyword);
    });
  }
  // Compare two rookie officials in selected state who share a bill keyword
  function renderRookieStateBillComparison(state, keyword) {
    const rookies = window.allOfficials.filter(off => off.state === state && off.rookie === true);
    const pool = rookies.filter(off =>
      Array.isArray(off.bills) &&
      off.bills.some(b => (b.title || '').toLowerCase().includes(keyword.toLowerCase()))
    );

    if (pool.length < 2) return;

    const sorted = [...pool].sort((a, b) => {
      const aScore = (a.views || 0) + (a.clicks || 0);
      const bScore = (b.views || 0) + (b.clicks || 0);
      return bScore - aScore;
    });

    const [offA, offB] = sorted.slice(0, 2);
    renderComparison(offA, offB);
  }

  // Wire compare-by-rookie-state-bill tab
  const compareRookieStateBillBtn = document.getElementById('compare-rookie-state-bill-btn');
  const compareRookieStateBillSelect = document.getElementById('compare-rookie-state-bill-select');
  const compareRookieStateBillInput = document.getElementById('compare-rookie-state-bill-keyword');

  if (compareRookieStateBillBtn && compareRookieStateBillSelect && compareRookieStateBillInput) {
    compareRookieStateBillBtn.addEventListener('click', () => {
      const state = compareRookieStateBillSelect.value;
      const keyword = compareRookieStateBillInput.value.trim();
      if (state && keyword) renderRookieStateBillComparison(state, keyword);
    });
  }
