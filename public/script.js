let selectedState = 'North Carolina';
let governors = [];
let ltGovernors = [];
let senators = [];
let houseReps = [];
let officialsContainer = null;
let searchBar = null;
let modal = null;
let modalContent = null;
let closeModal = null;

function showTab(id) {
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.style.display = 'none';
  });
  const activeTab = document.getElementById(id);
  if (activeTab) activeTab.style.display = 'block';
}
function showVoting() {
  showTab('voting');
  const votingCards = document.getElementById('voting-cards');
  votingCards.innerHTML = '';
console.log("showVoting() triggered");

  fetch('voting-data.json')
    .then(res => {
      if (!res.ok) throw new Error('Voting data file not found');
      return res.json();
    })
    .then(data => {
     const selectedState = window.selectedState || 'North Carolina';
     const stateData = data[selectedState] || (selectedState === 'U.S. Virgin Islands' ? data['U.S. Virgin Islands'] : null);

      if (!stateData || typeof stateData !== 'object') {
        votingCards.innerHTML = `<p>No voting information available for ${selectedState}.</p>`;
        return;
      }
console.log("Selected state:", selectedState);
      const labelMap = {
        register: 'Register to Vote',
        id: 'Voter ID Requirements',
        absentee: 'Absentee Voting',
        early: 'Early Voting',
        polling: 'Find Your Polling Place',
        sample: 'View Sample Ballot',
        military: 'Military & Overseas Voting',
        counties: 'County Election Contacts',
        tools: 'State Voting Tools'
      };

      Object.entries(stateData).forEach(([key, value]) => {
        const { url, icon, description, deadline } = typeof value === 'string'
          ? { url: value, icon: '🗳️', description: '', deadline: '' }
          : value;

        const title = labelMap[key] || key;

        const card = document.createElement('div');
        card.className = 'voting-card';

        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';

        const iconDiv = document.createElement('div');
        iconDiv.className = 'card-icon';
        iconDiv.innerHTML = `<span class="emoji">${icon || '🗳️'}</span>`;

        const labelDiv = document.createElement('div');
        labelDiv.className = 'card-label';
        labelDiv.textContent = title;

        const descDiv = document.createElement('div');
        descDiv.className = 'card-description';
        descDiv.textContent = description || '';

        const deadlineDiv = document.createElement('div');
        deadlineDiv.className = 'card-date';
        if (deadline) deadlineDiv.textContent = deadline;

        link.appendChild(iconDiv);
        link.appendChild(labelDiv);
        link.appendChild(descDiv);
        if (deadline) link.appendChild(deadlineDiv);

        card.appendChild(link);
        votingCards.appendChild(card);
      });
    })
    .catch(err => {
      votingCards.innerHTML = '<p>Error loading voting data.</p>';
      console.error('Voting fetch failed:', err);
    });
}
function showCivic() {
  showTab('civic');
  const calendar = document.getElementById('calendar');
  calendar.innerHTML = '';

  const section = document.createElement('div');
  section.className = 'civic-section';

  const stateBlock = document.createElement('div');
  stateBlock.className = 'civic-block';
  stateBlock.innerHTML = '<h2>State Legislative Links</h2>';

  fetch('/state-links.json')
    .then(res => res.json())
    .then(stateLinks => {
      const links = stateLinks[selectedState] || {};

      const allowedLabels = ['bills', 'senate', 'house', 'local'];
      const labelMap = {
        bills: 'Bills',
        senate: 'State Senate',
        house: 'State House',
        local: 'Local Government'
      };

      const filtered = Object.entries(links).filter(([label]) => {
        const lowerLabel = label.toLowerCase();
        return allowedLabels.some(key => lowerLabel.includes(key));
      }).map(([label, url]) => {
        const key = allowedLabels.find(k => label.toLowerCase().includes(k));
        const displayLabel = labelMap[key] || label;
        return { label: displayLabel, url };
      });

      const grid = document.createElement('div');
      grid.className = 'link-grid';

      filtered.forEach(({ label, url }) => {
        const card = document.createElement('div');
        card.className = 'link-card';
        card.innerHTML = `
          <h4>${label}</h4>
          <p class="card-desc">Click to view ${label} information for ${selectedState}.</p>
          <a href="${url}" target="_blank" class="card-button">Open</a>
        `;
        grid.appendChild(card);
      });

      stateBlock.appendChild(grid);

      const federalBlock = document.createElement('div');
      federalBlock.className = 'civic-block';
      federalBlock.innerHTML = '<h2>Federal Oversight & Transparency</h2>';

      const federalLinks = [
        {
          label: 'Committees',
          url: 'https://www.govtrack.us/congress/committees',
          desc: 'Explore congressional committees and their membership.'
        },
        {
          label: 'Legislator Report Cards',
          url: 'https://www.govtrack.us/congress/members/report-cards',
          desc: 'See performance grades for federal legislators.'
        },
        {
          label: 'All Federal Bills',
          url: 'https://www.govtrack.us/congress/bills/',
          desc: 'Track every bill introduced in Congress.'
        },
        {
          label: 'Recent Votes',
          url: 'https://www.govtrack.us/congress/votes',
          desc: 'Review the latest recorded votes in Congress.'
        }
      ];

      const federalGrid = document.createElement('div');
      federalGrid.className = 'link-grid';

      federalLinks.forEach(link => {
        const card = document.createElement('div');
        card.className = 'link-card';
        card.innerHTML = `
          <h4>${link.label}</h4>
          <p class="card-desc">${link.desc}</p>
          <a href="${link.url}" target="_blank" class="card-button">Open</a>
        `;
        federalGrid.appendChild(card);
      });

      federalBlock.appendChild(federalGrid);
      section.appendChild(stateBlock);
      section.appendChild(federalBlock);
      calendar.appendChild(section);
    })
    .catch(err => {
      calendar.innerHTML = '<p>Error loading civic links.</p>';
      console.error(err);
    });
}
function showOrganizations() {
  showTab('organizations');
  const section = document.getElementById('organizations');
  section.innerHTML = '';

  fetch('/political-groups.json')
    .then(res => res.json())
    .then(groups => {
      const grid = document.createElement('div');
      grid.className = 'organization-grid';

      groups.forEach(group => {
        const card = document.createElement('div');
        card.className = 'organization-card';

        const logoWrapper = document.createElement('div');
        logoWrapper.className = 'logo-wrapper';

        const img = document.createElement('img');
        img.src = group.logo;
        img.alt = `${group.name} logo`;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'contain';
        img.onerror = () => {
          img.src = 'assets/default-logo.png';
        };

        logoWrapper.appendChild(img);

        const infoWrapper = document.createElement('div');
        infoWrapper.className = 'info-wrapper';
        infoWrapper.innerHTML = `
          <h3>${group.name}</h3>
          <p>${group.description}</p>
          <p><strong>Platform:</strong> ${group.platform}</p>
          <a href="${group.website}" target="_blank">Visit Website</a>
        `;

        card.appendChild(logoWrapper);
        card.appendChild(infoWrapper);
        grid.appendChild(card);
      });

      section.appendChild(grid);
    })
    .catch(err => {
      section.innerHTML = '<p>Error loading political groups.</p>';
      console.error(err);
    });
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
function openModal(official) {
  const modal = document.getElementById('officials-modal');
  const modalContent = document.getElementById('officials-content');
  if (!modal || !modalContent) return;

  const contact = official.contact || {};
  const bills = official.billsSigned || [];

  const photoSrc = official.photo && official.photo.trim() !== ''
    ? official.photo
    : 'assets/default-photo.png';

  modalContent.innerHTML = `
    <div class="modal-card">
      <div class="modal-photo">
        <img src="${photoSrc}" alt="${official.name}" onerror="this.onerror=null;this.src='assets/default-photo.png';" />
      </div>
      <div class="modal-info">
        <h2>${official.name}</h2>
        <p><strong>Office:</strong> ${official.office}</p>
        ${official.district ? `<p><strong>District:</strong> ${official.district}</p>` : ''}
        <p><strong>State:</strong> ${official.state}</p>
        <p><strong>Party:</strong> ${official.party}</p>
        <p><strong>Term:</strong> ${new Date(official.termStart).getFullYear()}–${new Date(official.termEnd).getFullYear()}</p>
        ${official.bio ? `<p>${official.bio}</p>` : ''}
        ${official.education ? `<p><strong>Education:</strong> ${official.education}</p>` : ''}
        ${official.platform ? `<p><strong>Platform:</strong> ${official.platform}</p>` : ''}
        ${official.proposals ? `<p><strong>Proposals:</strong> ${official.proposals}</p>` : ''}
        ${(official.vetoes && ['Governor', 'President'].includes(official.office))
        ? `<p><strong>Vetoes:</strong> ${official.vetoes}</p>`
        : ''}
        ${official.salary ? `<p><strong>Salary:</strong> ${official.salary}</p>` : ''}
        ${official.website ? `<p><a href="${official.website}" target="_blank">Official Website</a></p>` : ''}
        ${contact.email ? `<p><strong>Email:</strong> ${contact.email}</p>` : ''}
        ${contact.phone ? `<p><strong>Phone:</strong> ${contact.phone}</p>` : ''}
        ${contact.website ? `<p><a href="${contact.website}" target="_blank">Contact Website</a></p>` : ''}
        ${official.ballotpediaLink ? `<p><a href="${official.ballotpediaLink}" target="_blank">Ballotpedia Profile</a></p>` : ''}
        ${(bills.length > 0 && ['Governor', 'President'].includes(official.office))
  ? `<h3>Bills Signed</h3><ul>${bills.map(b => `<li><a href="${b.link}" target="_blank">${b.title}</a></li>`).join('')}</ul>`
  : ''}
      </div>
    </div>
  `;

  modal.style.display = 'block';

  // Enable click-outside-to-close
  window.onclick = function(event) {
    if (event.target === modal) {
      modal.style.display = 'none';
    }
  };
}
function closeModalWindow() {
  modal.style.display = 'none';
}

function wireSearchBar() {
  searchBar.addEventListener('input', () => {
    const query = searchBar.value.trim();
    renderOfficials(null, query);
  });
}

function wireStateDropdown() {
  const dropdown = document.getElementById('state-dropdown');
  if (!dropdown) return;

  dropdown.value = selectedState;

  dropdown.addEventListener('change', () => {
    selectedState = dropdown.value;
    renderOfficials(selectedState, '');
  });
}
document.addEventListener('DOMContentLoaded', () => {
  officialsContainer = document.getElementById('officials-container');
  searchBar = document.getElementById('search-bar');
  modal = document.getElementById('modal');
  modalContent = document.getElementById('modal-content');
  closeModal = document.getElementById('close-modal');

  closeModal.addEventListener('click', closeModalWindow);
  window.addEventListener('click', event => {
    if (event.target === modal) closeModalWindow();
  });

  wireSearchBar();
  wireStateDropdown();

  Promise.all([
    fetch('/governors.json').then(res => res.json()),
    fetch('/ltgovernors.json').then(res => res.json()),
    fetch('/senators.json').then(res => res.json()),
    fetch('/housereps.json').then(res => res.json())
  ])
    .then(([govs, ltGovs, sens, reps]) => {
      governors = govs;
      ltGovernors = ltGovs;
      senators = sens;
      houseReps = reps;
      renderOfficials(selectedState, '');
    })
    .catch(err => {
      console.error('Error loading official data:', err);
    });
});
