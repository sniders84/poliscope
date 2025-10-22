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

  function toJurisdictionSlug(stateName) {
    return stateName.toLowerCase().replace(/\s+/g, '-');
  }

  function showTab(id) {
    document.querySelectorAll('.tab-content').forEach(tab => {
      tab.style.display = 'none';
    });
    document.getElementById(id).style.display = 'block';
  }

  function renderOfficials(stateFilter = null, query = '') {
    showTab('my-officials');
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

  stateSelector.addEventListener('change', () => {
    selectedState = stateSelector.value;
    renderOfficials(selectedState, searchBar.value.trim());
  });

  searchBar.addEventListener('input', () => {
    renderOfficials(selectedState, searchBar.value.trim());
  });

  closeModal.addEventListener('click', () => {
    modal.style.display = 'none';
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  });
});

// ✅ Global function so it's accessible from HTML
function showCalendar() {
  showTab('calendar');
  const calendarSection = document.getElementById('calendar');
  calendarSection.innerHTML = '<h2>Election Calendar</h2>';

  const apiKey = 'aeb782db-6584-4ffe-9902-da6e234e95e6';
  const jurisdiction = toJurisdictionSlug(selectedState);
  const url = `https://v3.openstates.org/events?jurisdiction=${jurisdiction}&apikey=${apiKey}`;

  console.log("Calendar API URL:", url);

  fetch(url)
    .then(res => {
      console.log("Calendar API status:", res.status);
      return res.json();
    })
    .then(data => {
      console.log("Calendar API data:", data);
      const events = data.results || [];
      if (events.length === 0) {
        calendarSection.innerHTML += '<p>No upcoming events found for this jurisdiction.</p>';
        return;
      }

      const list = document.createElement('ul');
      events.forEach(event => {
        const date = new Date(event.start_date).toLocaleString('en-US', {
          dateStyle: 'medium',
          timeStyle: 'short'
        });
        const location = event.location?.name || 'Location TBD';
        const type = event.classification || 'Unclassified';

        const item = document.createElement('li');
        item.innerHTML = `
          <strong>${event.name}</strong><br>
          ${date} — ${location} (${type})
        `;
        list.appendChild(item);
      });
      calendarSection.appendChild(list);
    })
    .catch(err => {
      calendarSection.innerHTML += '<p>Error loading calendar events.</p>';
      console.error('Calendar API Error:', err);
    });
}

// ✅ Global function so it's accessible from HTML
function showActivist() {
  showTab('activist');
  const activistSection = document.getElementById('activist');
  activistSection.innerHTML = '<h2>Activist & Grassroots</h2>';

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
      activistSection.appendChild(list);
    })
    .catch(err => {
      activistSection.innerHTML += '<p>Error loading activist groups.</p>';
      console.error(err);
    });
}
