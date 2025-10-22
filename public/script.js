let selectedState = 'North Carolina';
let governors = [];
let ltGovernors = [];
let senators = [];
let houseReps = [];
let officialsContainer = null;

// ✅ Global utility function
function toJurisdictionSlug(stateName) {
  return stateName.toLowerCase().replace(/\s+/g, '-');
}

// ✅ Global function so it's accessible from HTML
function showTab(id) {
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.style.display = 'none';
  });
  const activeTab = document.getElementById(id);
  if (activeTab) activeTab.style.display = 'block';
}

// ✅ Full API integration for calendar events across all jurisdictions
function showCalendar() {
  showTab('calendar');
  const calendarSection = document.getElementById('calendar');
  calendarSection.innerHTML = '<h2>Election Calendar</h2><p>Loading events from all jurisdictions...</p>';

  const apiKey = 'aeb782db-6584-4ffe-9902-da6e234e95e6';
  const baseUrl = 'https://v3.openstates.org';
  const jurisdictions = [
    'ocd-jurisdiction/country:us/state:north_carolina',
    'ocd-jurisdiction/country:us/state:california',
    'ocd-jurisdiction/country:us/state:texas',
    'ocd-jurisdiction/country:us/state:new_york',
    'ocd-jurisdiction/country:us/state:florida',
    'ocd-jurisdiction/country:us/state:illinois',
    'ocd-jurisdiction/country:us/state:pennsylvania',
    'ocd-jurisdiction/country:us/state:ohio',
    'ocd-jurisdiction/country:us/state:georgia',
    'ocd-jurisdiction/country:us/state:michigan',
    'ocd-jurisdiction/country:us/state:arizona',
    'ocd-jurisdiction/country:us/state:virginia',
    'ocd-jurisdiction/country:us/state:massachusetts',
    'ocd-jurisdiction/country:us/state:tennessee',
    'ocd-jurisdiction/country:us/state:indiana',
    'ocd-jurisdiction/country:us/state:missouri',
    'ocd-jurisdiction/country:us/state:washington',
    'ocd-jurisdiction/country:us/state:wisconsin',
    'ocd-jurisdiction/country:us/state:colorado',
    'ocd-jurisdiction/country:us/state:minnesota'
  ];

  const eventPromises = jurisdictions.map(jurisdiction =>
    fetch(`${baseUrl}/events?jurisdiction=${jurisdiction}&apikey=${apiKey}`)
  .then(res => {
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} for ${jurisdiction}`);
    }
    return res.json();
  })
  .then(eventData => ({ jurisdiction, events: eventData.results || [] }))
  .catch(err => {
    console.error(`Error fetching events for ${jurisdiction}:`, err);
    return { jurisdiction, events: [], error: true };
  });

  Promise.all(eventPromises)
    .then(allResults => {
      calendarSection.innerHTML = '<h2>Election Calendar</h2>';
      let totalEvents = 0;

      allResults.forEach(({ jurisdiction, events, error }) => {
        if (error || events.length === 0) return;

        const stateName = jurisdiction.split(':')[2].replace(/_/g, ' ').toUpperCase();
        const section = document.createElement('div');
        section.className = 'calendar-jurisdiction';
        section.innerHTML = `<h3>${stateName}</h3>`;
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

        section.appendChild(list);
        calendarSection.appendChild(section);
        totalEvents += events.length;
      });

      if (totalEvents === 0) {
        calendarSection.innerHTML += '<p>No upcoming events found for any jurisdiction.</p>';
      }
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

// ✅ DOMContentLoaded block remains unchanged
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
          ${districtDisplay
                      <p><strong>State:</strong> ${o.state}</p>
          <p><strong>Term:</strong> ${new Date(o.termStart).getFullYear()}–${new Date(o.termEnd).getFullYear()}</p>
          <p><strong>Party:</strong> ${o.party}</p>
        </div>
      `;
      card.addEventListener('click', () => openModal(o));
      officialsContainer.appendChild(card);
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
              <strong>${v.vote}:</strong> <a href="${v.link}" target="_blank">${v.title}</a> (${v.result}, ${v.date})
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
