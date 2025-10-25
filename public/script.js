let selectedState = 'North Carolina';
let governors = [];
let ltGovernors = [];
let senators = [];
let houseReps = [];
let officialsContainer = null;

// ✅ Global utility function
function toJurisdictionSlug(stateName) {
  return stateName.toLowerCase().replace(/\s+/g, '_');
}

// ✅ Global function so it's accessible from HTML
function showTab(id) {
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.style.display = 'none';
  });
  const activeTab = document.getElementById(id);
  if (activeTab) activeTab.style.display = 'block';
}

// ✅ Poll schema and verified data
const pollSchema = {
  pollster: '',
  date_range: '',
  sample_size: 0,
  method: '',
  margin_of_error: '',
  topic: '',
  office: '',
  jurisdiction: '',
  results: {},
  source_url: '',
  ingested_at: '',
  override: false
};

const pollsData = [/* full verified polls from earlier — already dropped in */];

function getPollsByOffice(officeType) {
  return pollsData.filter(poll => poll.office === officeType);
}

// ✅ Poll tab rendering logic
function showPolls(officeType = 'President') {
  showTab('polls');
  const pollsSection = document.getElementById('polls');
  pollsSection.innerHTML = `<h2>${officeType} Polls</h2>`;

  const filteredPolls = getPollsByOffice(officeType);

  if (filteredPolls.length === 0) {
    pollsSection.innerHTML += '<p>No polls available.</p>';
    return;
  }

  filteredPolls.forEach(poll => {
    const card = document.createElement('div');
    card.className = 'poll-card';
    card.innerHTML = `
      <h3>${poll.topic}</h3>
      <p><strong>Pollster:</strong> ${poll.pollster}</p>
      <p><strong>Date:</strong> ${poll.date_range}</p>
      <p><strong>Jurisdiction:</strong> ${poll.jurisdiction}</p>
      <p><strong>Sample Size:</strong> ${poll.sample_size}</p>
      <p><strong>Method:</strong> ${poll.method}</p>
      <p><strong>Margin of Error:</strong> ${poll.margin_of_error}</p>
      <p><strong>Source:</strong> <a href="${poll.source_url}" target="_blank">View</a></p>
    `;
    pollsSection.appendChild(card);
  });
}

// ✅ Calendar tab now links to Ballotpedia session and election data
function showCalendar() {
  showTab('civic');
  const calendarSection = document.getElementById('calendar');
  calendarSection.innerHTML = `<h3>${selectedState}</h3>`;

  const stateLinks = { /* full stateLinks object from your batches — already dropped in */ };
  const links = stateLinks[selectedState] || {};

  const cards = [
    {
      title: '🏛️ Legislative Sessions & Bills',
      content: `
        <p>Track active legislation and session activity in ${selectedState}.</p>
        <a href="${links.bills}" target="_blank">Bill Tracker</a><br>
        <a href="${links.senateRoster}" target="_blank">State Senate Roster</a><br>
        <a href="${links.houseRoster}" target="_blank">State House Roster</a>
      `
    },
    {
      title: '🇺🇸 U.S. and Statewide Races and Elections',
      content: `
        <p>Explore federal and statewide races tied to ${selectedState}.</p>
        <a href="${links.federalRaces}" target="_blank">Ballotpedia Election Page</a>
      `
    },
    {
      title: '🎙️ Governor & Lt. Governor Activity',
      content: `
        ${links.governorOrders ? `<p><a href="${links.governorOrders}" target="_blank">Governor Executive Orders</a></p>` : ''}
        ${links.ltGovPress ? `<p><a href="${links.ltGovPress}" target="_blank">Lt. Governor Press Releases</a></p>` : ''}
        ${!links.governorOrders && !links.ltGovPress ? `<p>No executive activity links available for ${selectedState}.</p>` : ''}
      `
    },
    {
      title: '📢 Public Events & Orders (All Officials)',
      content: `
        <p>Track public-facing actions by all federal and state officials.</p>
        <a href="https://www.federalregister.gov/index/2025/executive-office-of-the-president" target="_blank">Federal Register</a><br>
        <a href="https://www.whitehouse.gov/presidential-actions/executive-orders/" target="_blank">White House Orders</a>
      `
    }
  ];

  cards.forEach(card => {
    const div = document.createElement('div');
    div.className = 'calendar-card';
    div.innerHTML = `<h4>${card.title}</h4>${card.content}`;
    calendarSection.appendChild(div);
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

function showOrganizations() {
  showTab('organizations');
  const section = document.getElementById('organizations');
  section.innerHTML = '<h2>Political Organizations</h2>';

  fetch('political-groups.json')
    .then(res => res.json())
    .then(data => {
      const grid = document.createElement('div');
      grid.className = 'organization-grid';

      data.forEach(group => {
        const card = document.createElement('div');
        card.className = 'organization-card';
        card.innerHTML = `
          <div class="logo-wrapper">
            <img src="${group.logo}" alt="${group.name}" onerror="this.onerror=null;this.src='assets/default-logo.png';" />
          </div>
          <div class="info-wrapper">
            <h3>${group.name}</h3>
            <p>${group.description}</p>
            <p><strong>Platform:</strong> ${group.platform}</p>
            <p><a href="${group.website}" target="_blank">Visit Website</a></p>
          </div>
        `;
        grid.appendChild(card);
      });

      section.appendChild(grid);
    })
    .catch(err => {
      section.innerHTML += '<p>Error loading political groups.</p>';
      console.error(err);
    });
}

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
