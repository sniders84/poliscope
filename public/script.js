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
window.showTab = showTab;

function showVoting() {
  showTab('voting');
  const votingCards = document.getElementById('voting-cards');
  votingCards.innerHTML = '';

  fetch('/voting.json')
    .then(res => res.json())
    .then(data => {
      const stateData = data[selectedState] || [];
      stateData.forEach(item => {
        const card = document.createElement('div');
        card.className = 'voting-card';
        card.innerHTML = `
          <h3>${item.title}</h3>
          <p>${item.description}</p>
          <a href="${item.link}" target="_blank">Learn More</a>
        `;
        votingCards.appendChild(card);
      });
    })
    .catch(err => {
      votingCards.innerHTML = '<p>Error loading voting data.</p>';
      console.error(err);
    });
}

function showCivic() {
  showTab('civic');
  const calendar = document.getElementById('calendar');
  calendar.innerHTML = '';

  const section = document.createElement('div');
  section.className = 'civic-section';

  // State Legislative Links
  const stateBlock = document.createElement('div');
  stateBlock.className = 'civic-block';
  stateBlock.innerHTML = '<h2>State Legislative Links</h2>';

  fetch('/state-links.json')
    .then(res => res.json())
    .then(stateLinks => {
      const links = stateLinks[selectedState] || {};
      const filtered = Object.entries(links).filter(([label]) =>
        !['bills', 'senateRoster', 'houseRoster', 'governorOrders', 'ltGovPress', 'federalRaces'].includes(label)
      );

      if (filtered.length === 0) {
        stateBlock.innerHTML += '<p>No state links available.</p>';
      } else {
        const list = document.createElement('ul');
        filtered.forEach(([label, url]) => {
          const item = document.createElement('li');
          item.innerHTML = `<strong>${label}:</strong> <a href="${url}" target="_blank">${url}</a>`;
          list.appendChild(item);
        });
        stateBlock.appendChild(list);
      }

      // Federal Oversight & Transparency
      const federalBlock = document.createElement('div');
      federalBlock.className = 'civic-block';
      federalBlock.innerHTML = '<h2>Federal Oversight & Transparency</h2>';

      const federalLinks = [
        { label: 'GovTrack Committees', url: 'https://www.govtrack.us/congress/committees' },
        { label: 'Legislator Report Cards', url: 'https://www.govtrack.us/congress/members/report-cards' },
        { label: 'All Federal Bills', url: 'https://www.govtrack.us/congress/bills/' },
        { label: 'Recent Votes', url: 'https://www.govtrack.us/congress/votes' }
      ];

      const federalList = document.createElement('ul');
      federalLinks.forEach(link => {
        const item = document.createElement('li');
        item.innerHTML = `<strong>${link.label}:</strong> <a href="${link.url}" target="_blank">${link.url}</a>`;
        federalList.appendChild(item);
      });

      federalBlock.appendChild(federalList);
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
  section.innerHTML = '<h2>Political Organizations</h2>';

  fetch('/political-groups.json')
    .then(res => res.json())
    .then(groups => {
      const grid = document.createElement('div');
      grid.className = 'grid';

      groups.forEach(group => {
        const card = document.createElement('div');
        card.className = 'card';

        card.innerHTML = `
          <img src="${group.logo}" alt="${group.name} logo" />
          <h3>${group.name}</h3>
          <p>${group.description}</p>
          <p><strong>Platform:</strong> ${group.platform}</p>
          <a href="${group.website}" target="_blank">Visit Website</a>
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
    ${o.vetoes && ["Governor", "President", "Mayor"].includes(o.office) ? `<p><strong>Vetoes:</strong> ${o.vetoes}</p>` : ''}
    ${o.salary ? `<p><strong>Salary:</strong> ${o.salary}</p>` : ''}
        ${o.predecessor ? `<p><strong>Predecessor:</strong> ${o.predecessor}</p>` : ''}
    ${o.ballotpediaLink ? `<p><a href="${o.ballotpediaLink}" target="_blank">Ballotpedia Profile</a></p>` : ''}
    ${o.govtrackLink ? `<p><a href="${o.govtrackLink}" target="_blank">GovTrack Profile</a></p>` : ''}
    ${o.govtrackReportCard ? `<p><a href="${o.govtrackReportCard}" target="_blank">GovTrack Report Card</a></p>` : ''}
  `;
  modal.style.display = 'flex';
}

document.addEventListener('DOMContentLoaded', () => {
  const stateSelector = document.getElementById('state-selector');
  searchBar = document.getElementById('search-bar');
  officialsContainer = document.getElementById('officials-container');
  modal = document.getElementById('official-modal');
  modalContent = document.getElementById('modal-content');
  closeModal = document.getElementById('close-modal');

  stateSelector.addEventListener('change', function () {
    selectedState = this.value;
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

  document.getElementById('tab-voting').addEventListener('click', () => {
    showVoting();
  });

  document.querySelector("button[onclick=\"showTab('civic')\"]").addEventListener('click', showCivic);
  document.querySelector("button[onclick=\"showTab('organizations')\"]").addEventListener('click', showOrganizations);

  Promise.all([
    fetch('/governors.json').then(res => res.json()),
    fetch('/ltgovernors.json').then(res => res.json()),
    fetch('/senators.json').then(res => res.json()),
    fetch('/housereps.json').then(res => res.json())
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
});
