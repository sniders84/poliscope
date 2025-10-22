let selectedState = 'North Carolina';
let governors = [];
let ltGovernors = [];
let senators = [];
let houseReps = [];
let officialsContainer = null;

document.addEventListener('DOMContentLoaded', () => {
  const stateSelector = document.getElementById('state-selector');
  const searchBar = document.getElementById('search-bar');
  officialsContainer = document.getElementById('officials-container');
  const modal = document.getElementById('official-modal');
  const modalContent = document.getElementById('modal-content');
  const closeModal = document.getElementById('close-modal');

  Promise.all([
    fetch('governors.json').then(res => res.json()),
    fetch('ltgovernors.json').then(res => res.json()),
    fetch('senators.json').then(res => res.json()),
    fetch('housereps.json').then(res => res.json())
  ])
  .then(([govs, ltgovs, sens, reps]) => {
    governors = govs;
    ltGovernors = ltgovs;
    senators = sens;
    houseReps = reps;
    renderOfficials(selectedState, '');
  })
  .catch(error => {
    console.error('Error loading officials:', error);
  });

  function renderOfficials(stateFilter = null, query = '') {
    officialsContainer.innerHTML = '';

    const queryLower = query.toLowerCase();
    const filterByState = query === '';

    const filteredGovs = governors.filter(o => !filterByState || o.state === stateFilter);
    const filteredLtGovs = ltGovernors.filter(o => !filterByState || o.state === stateFilter);
    const filteredSens = senators.filter(o => !filterByState || o.state === stateFilter);
    const filteredReps = houseReps
      .filter(o => !filterByState || o.state === stateFilter)
      .sort((a, b) => parseInt(a.district) - parseInt(b.district));

    const allOfficials = [
      ...filteredGovs,
      ...filteredLtGovs,
      ...filteredSens,
      ...filteredReps
    ].filter(o =>
      o.name.toLowerCase().includes(queryLower) ||
      o.office.toLowerCase().includes(queryLower) ||
      o.state.toLowerCase().includes(queryLower)
    );

    const partyMap = {
      republican: 'republican',
      democrat: 'democrat',
      democratic: 'democrat',
      independent: 'independent',
      green: 'green',
      libertarian: 'libertarian',
      constitution: 'constitution',
      'working families': 'workingfamilies',
      workingfamilies: 'workingfamilies',
      progressive: 'progressive'
    };

    allOfficials.forEach(o => {
      const rawParty = (o.party || '').toLowerCase().trim();
      const normalizedParty = partyMap[rawParty] || rawParty.replace(/\s+/g, '') || 'independent';
      const photoSrc = o.photo && o.photo.trim() !== '' ? o.photo : 'assets/default-photo.png';

      const districtDisplay = o.office === 'U.S. Representative' && o.district
        ? `<p class="district-display"><strong>District:</strong> ${o.district}</p>`
        : '';

      const card = document.createElement('div');
      card.className = `official-card ${normalizedParty}`;
      card.innerHTML = `
        <div class="party-stripe"></div>
        <div class="photo-wrapper">
          <img src="${photoSrc}" alt="${o.name}" onerror="this.onerror=null;this.src='assets/default-photo.png';" />
        </div>
        <div class="official-info">
          <h3>${o.name}</h3>
          <p><strong>Position:</strong> ${o.office}</p>
          ${districtDisplay}
          <p><strong>State:</strong> ${o.state}</p>
          <p><strong>Term:</strong> ${new Date(o.termStart).getFullYear()}–${new Date(o.termEnd).getFullYear()}</p>
          <p><strong>Party:</strong> ${o.party}</p>
        </div>
      `;
      card.addEventListener('click', () => openModal(o));
      officialsContainer.appendChild(card);
    });
  }

  function showCalendar() {
    if (!officialsContainer) {
      console.error('officialsContainer not initialized');
      return;
    }

    officialsContainer.innerHTML = '<h2>State Calendar</h2>';
    console.log('Selected State:', selectedState);

    fetch('/state-calendars.json')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load calendar file');
        return res.json();
      })
      .then(data => {
        console.log('Available states in calendar:', Object.keys(data));

        const stateKey = Object.keys(data).find(k => k.toLowerCase() === selectedState.toLowerCase());
        if (!stateKey) {
          officialsContainer.innerHTML += `<p>No calendar data found for <strong>${selectedState}</strong>.</p>`;
          console.warn(`State "${selectedState}" not found in calendar data.`);
          return;
        }

        const events = data[stateKey];
        console.log('Events for', stateKey, events);

        if (!Array.isArray(events) || events.length === 0) {
          officialsContainer.innerHTML += '<p>No events found for this state.</p>';
          return;
        }

        const list = document.createElement('ul');
        events.forEach(event => {
          const item = document.createElement('li');
          item.innerHTML = `
            <strong>${event.title}</strong><br>
            ${event.date} — ${event.location} (${event.type})
          `;
          list.appendChild(item);
        });
        officialsContainer.appendChild(list);
      })
      .catch(err => {
        officialsContainer.innerHTML += '<p>Error loading calendar.</p>';
        console.error('Calendar Load Error:', err);
      });
  }

  function showActivist() {
    officialsContainer.innerHTML = '<h2>National Grassroots Organizations</h2>';

    fetch('activist-groups.json')
      .then(res => res.json())
      .then(data => {
        const list = document.createElement('ul');
        data.forEach(group => {
          const item = document.createElement('li');
          item.innerHTML = `
            <strong>${group.name}</strong><br>
            ${group.description}<br>
            <a href="${group.website}" target="_blank">${group.website}</a>
          `;
          list.appendChild(item);
        });
        officialsContainer.appendChild(list);
      })
      .catch(err => {
        officialsContainer.innerHTML += '<p>Error loading activist groups.</p>';
        console.error(err);
      });
  }

  function openModal(o) {
    const modalPhoto = o.photo && o.photo.trim() !== '' ? o.photo : 'assets/default-photo.png';

    const districtDisplay = o.office === 'U.S. Representative' && o.district
      ? `<p><strong>District:</strong> ${o.district}</p>`
      : '';

    modalContent.innerHTML = `
      <h2>${o.name}</h2>
      <div class="modal-photo-wrapper">
        <img src="${modalPhoto}" alt="${o.name}" onerror="this.onerror=null;this.src='assets/default-photo.png';" />
      </div>
      <p><strong>Office:</strong> ${o.office}</p>
      ${districtDisplay}
      <p><strong>Party:</strong> ${o.party}</p>
      <p><strong>State:</strong> ${o.state}</p>
      <p><strong>Term:</strong> ${o.termStart} → ${o.termEnd}</p>
      ${o.bio ? `<p><strong>Bio:</strong> ${o.bio}</p>` : ''}
      ${o.education ? `<p><strong>Education:</strong> ${o.education}</p>` : ''}
      ${o.endorsements ? `<p><strong>Endorsements:</strong> ${o.endorsements}</p>` : ''}
      ${o.platform ? `<p><strong>Platform:</strong> ${o.platform}</p>` : ''}
      ${o.platformFollowThrough ? `
        <h4>Platform Follow-Through</h4>
        <ul>
          ${Object.entries(o.platformFollowThrough).map(([key, val]) => `<li><strong>${key}:</strong> ${val}</li>`).join('')}
        </ul>
      ` : ''}
      ${o.proposals ? `<p><strong>Proposals:</strong> ${o.proposals}</p>` : ''}
      ${o.keyVotes?.length ? `
        <h4>Key Votes</h4>
        <ul>
          ${o.keyVotes.map(v => `
            <li>
              <strong>${v.vote}:</strong> 
              <a href="${v.link}" target="_blank">${v.title}</a>               (${v.result}, ${v.date})
            </li>
          `).join('')}
        </ul>
      ` : ''}
      ${o.billsSigned?.length ? `
        <h4>Bills Signed</h4>
        <ul>
          ${o.billsSigned.map(b => `<li><a href="${b.link}" target="_blank">${b.title}</a></li>`).join('')}
        </ul>
      ` : ''}
      ${o.vetoes ? `<p><strong>Vetoes:</strong> ${o.vetoes}</p>` : ''}
      ${o.salary ? `<p><strong>Salary:</strong> ${o.salary}</p>` : ''}
      ${o.predecessor ? `<p><strong>Predecessor:</strong> ${o.predecessor}</p>` : ''}
      ${o.pollingScore && o.pollingSource ? `
        <p><strong>Approval Rating:</strong> 
          <a href="${o.pollingSource}" target="_blank">${o.pollingScore}</a>
        </p>
      ` : ''}
      ${o.ballotpediaLink ? `<p><a href="${o.ballotpediaLink}" target="_blank">Ballotpedia Profile</a></p>` : ''}
      ${o.govtrackLink ? `<p><a href="${o.govtrackLink}" target="_blank">GovTrack Profile</a></p>` : ''}
      ${o.govtrackReportCard ? `<p><a href="${o.govtrackReportCard}" target="_blank">GovTrack Report Card</a></p>` : ''}
    `;
    modal.style.display = 'flex';
  }

  closeModal.addEventListener('click', () => {
    modal.style.display = 'none';
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  });

  stateSelector.addEventListener('change', () => {
    selectedState = stateSelector.value;
    renderOfficials(selectedState, searchBar.value.trim());
  });

  searchBar.addEventListener('input', () => {
    renderOfficials(selectedState, searchBar.value.trim());
  });
});

