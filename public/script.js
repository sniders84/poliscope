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

// Global poll categories data (final, corrected)
const pollCategories = [
  {
    label: 'President',
    polls: [
      { source: 'Ballotpedia', name: 'Ballotpedia – Presidential approval index', url: 'https://ballotpedia.org/Ballotpedia%27s_Polling_Index:_Presidential_approval_rating' },
      { source: 'RCP', name: 'RCP – Presidential job approval', url: 'https://www.realclearpolling.com/polls/approval/donald-trump/approval-rating' },
      { source: '270toWin', name: '270toWin – 2028 Republican primary polls', url: 'https://www.270towin.com/2028-republican-nomination/' },
      { source: '270toWin', name: '270toWin – 2028 Democratic primary polls', url: 'https://www.270towin.com/2028-democratic-nomination/' },
      { source: 'Cook Political', name: 'Cook Political Report – Presidential coverage', url: 'https://www.cookpolitical.com/' },
      { source: 'Sabato', name: 'Sabato’s Crystal Ball – Presidential elections', url: 'https://centerforpolitics.org/crystalball/' },
      { source: 'AP-NORC', name: 'AP-NORC – Polling tracker (approval and key issues)', url: 'https://apnews.com/projects/polling-tracker/' },
      { source: 'DDHQ', name: 'Decision Desk HQ – Polls averages hub', url: 'https://decisiondeskhq.com/polls/averages/' },
      { source: 'Gallup', name: 'Gallup – Presidential job approval topic', url: 'https://news.gallup.com/topic/presidential-job-approval.aspx' },
      { source: 'American Presidency Project', name: 'UCSB – Presidential job approval (Gallup historical)', url: 'https://www.presidency.ucsb.edu/statistics/data/presidential-job-approval-all-data' }
    ]
  },
  {
    label: 'Vice President',
    polls: [
      { source: 'RCP', name: 'RCP – JD Vance favorability', url: 'https://www.realclearpolling.com/polls/favorability/j-d-vance' },
      { source: 'DDHQ', name: 'Decision Desk HQ – Polls averages hub', url: 'https://decisiondeskhq.com/polls/averages/' },
      { source: 'Ballotpedia', name: 'Ballotpedia – Vice presidential candidates', url: 'https://ballotpedia.org/Vice_presidential_candidates,_2024' },
      { source: 'Cook Political', name: 'Cook Political Report – Vice presidential coverage', url: 'https://www.cookpolitical.com/' },
      { source: 'Sabato', name: 'Sabato’s Crystal Ball – Vice presidential coverage', url: 'https://centerforpolitics.org/crystalball/' },
      { source: 'RaceToWH', name: 'Race to the WH – GOP VP primary tracker', url: 'https://www.racetothewh.com/2024/rep' },
      { source: 'RaceToWH', name: 'Race to the WH – Democratic VP primary tracker', url: 'https://www.racetothewh.com/2024/dem' },
      { source: 'AP-NORC', name: 'AP-NORC – Polling tracker (issues/approval context)', url: 'https://apnews.com/projects/polling-tracker/' },
      { source: 'NBC Tracker', name: 'NBC – Presidential candidates tracker context', url: 'https://www.nbcnews.com/politics/2024-elections/presidential-candidates-tracker' },
      { source: 'ABC Explainer', name: 'ABC News – How primaries work explainer', url: 'https://abcnews.go.com/Politics/2024-republican-democratic-presidential-primaries-caucuses-work/story?id=106765290' }
    ]
  },
  {
    label: 'Governor',
    polls: [
      { source: 'Ballotpedia', name: 'Ballotpedia – 2025 governor elections', url: 'https://ballotpedia.org/Gubernatorial_elections,_2025' },
      { source: 'RCP', name: 'RCP – Governor polls', url: 'https://www.realclearpolling.com/latest-polls/governor' },
      { source: 'DDHQ', name: 'DDHQ – Virginia governor general ballot test average', url: 'https://polls.decisiondeskhq.com/averages/general-ballot-test/2025-virginia-governor/virginia/lv-rv-adults' },
      { source: '270toWin', name: '270toWin – Latest 2026 governor polls', url: 'https://www.270towin.com/polls/latest-2026-governor-election-polls/' },
      { source: 'Cook Political', name: 'Cook Political Report – Governor ratings', url: 'https://www.cookpolitical.com/ratings/governor-race-ratings' },
      { source: 'Sabato', name: 'Sabato’s Crystal Ball – 2026 governor elections', url: 'https://centerforpolitics.org/crystalball/2026-governor/' },
      { source: 'AP-NORC', name: 'AP-NORC – Polling tracker (issues/approval context)', url: 'https://apnews.com/projects/polling-tracker/' },
      { source: 'Decision Night', name: 'DDHQ – Election night results hub', url: 'https://election-night.decisiondeskhq.com/date/2025-11-04' },
      { source: 'DDHQ Results', name: 'DDHQ – 2025 Virginia results hub', url: 'https://decisiondeskhq.com/results/2025/General/Virginia/' },
      { source: 'The 19th', name: 'The 19th – Virginia governor overview', url: 'https://19thnews.org/2025/06/virginia-elections-spanberger-earle-sears-primary-governor/' }
    ]
  },
  {
    label: 'U.S. Senate',
    polls: [
      { source: 'Ballotpedia', name: 'Ballotpedia – 2026 Senate elections', url: 'https://ballotpedia.org/United_States_Senate_elections,_2026' },
      { source: 'RCP', name: 'RCP – Latest Senate polls', url: 'https://www.realclearpolling.com/latest-polls/senate' },
      { source: '270toWin', name: '270toWin – Latest 2026 Senate polls', url: 'https://www.270towin.com/polls/latest-2026-senate-election-polls/' },
      { source: 'Cook Political', name: 'Cook Political Report – 2026 Senate ratings', url: 'https://www.cookpolitical.com/ratings/senate-race-ratings' },
      { source: 'Sabato', name: 'Sabato’s Crystal Ball – 2026 Senate elections', url: 'https://centerforpolitics.org/crystalball/2026-senate/' },
      { source: 'DDHQ', name: 'Decision Desk HQ – Polls averages hub', url: 'https://decisiondeskhq.com/polls/averages/' },
      { source: 'Ballotpedia', name: 'Ballotpedia – Senate battleground overview', url: 'https://ballotpedia.org/United_States_Senate_elections,_2026#Battlegrounds' },
      { source: 'RCP', name: 'RCP – Senate race list', url: 'https://www.realclearpolitics.com/epolls/latest-polls/senate/' },
      { source: '270toWin', name: '270toWin – Senate map/race ratings', url: 'https://www.270towin.com/2026-senate' },
      { source: 'Center for Politics', name: 'Sabato – Crystal Ball archive (Senate)', url: 'https://centerforpolitics.org/crystalball/category/senate/' }
    ]
  },
  {
    label: 'U.S. House',
    polls: [
      { source: 'Ballotpedia', name: 'Ballotpedia – 2026 House elections', url: 'https://ballotpedia.org/United_States_House_of_Representatives_elections,_2026' },
      { source: 'RCP', name: 'RCP – Generic congressional ballot', url: 'https://www.realclearpolling.com/polls/state-of-the-union/generic-congressional-vote' },
      { source: '270toWin', name: '270toWin – Latest 2026 House polls', url: 'https://www.270towin.com/polls/latest-2026-house-election-polls/' },
      { source: 'Cook Political', name: 'Cook Political Report – 2026 House ratings', url: 'https://www.cookpolitical.com/ratings/house-race-ratings' },
      { source: 'Sabato', name: 'Sabato’s Crystal Ball – 2026 House elections', url: 'https://centerforpolitics.org/crystalball/2026-house/' },
      { source: 'DDHQ', name: 'Decision Desk HQ – Polls averages hub', url: 'https://decisiondeskhq.com/polls/averages/' },
      { source: 'RCP', name: 'RCP – Latest House polls list', url: 'https://www.realclearpolling.com/latest-polls/house' },
      { source: 'Ballotpedia', name: 'Ballotpedia – House battleground overview', url: 'https://ballotpedia.org/United_States_House_of_Representatives_elections,_2026#Battlegrounds' },
      { source: '270toWin', name: '270toWin – House ratings overview', url: 'https://www.270towin.com/2026-house-elections' },
      { source: 'Center for Politics', name: 'Sabato – Crystal Ball archive (House)', url: 'https://centerforpolitics.org/crystalball/category/house/' }
    ]
  }
];

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
  console.log('Voting data loaded:', data);
  console.log('Available voting keys:', Object.keys(data));
  console.log('Trying to match:', window.selectedState);
  let selectedState = window.selectedState || 'North Carolina';
  if (selectedState === 'Virgin Islands') selectedState = 'U.S. Virgin Islands';
  const stateData = data[selectedState] || (selectedState === 'U.S. Virgin Islands' ? data['U.S. Virgin Islands'] : null);

      if (!stateData || typeof stateData !== 'object') {
        votingCards.innerHTML = `<p>No voting information available for ${selectedState}.</p>`;
        return;
      }
console.log("Selected state:", selectedState);
console.log('Available voting keys:', Object.keys(data));
console.log('Trying to match:', selectedState);
console.log('Direct match result:', data[selectedState]);

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
  if (!value) return; // skip null, undefined, false, 0

  let url, icon, description, deadline;

  if (typeof value === 'string') {
    url = value;
    icon = '🗳️';
    description = '';
    deadline = '';
  } else if (typeof value === 'object' && value !== null) {
    ({ url, icon = '🗳️', description = '', deadline = '' } = value);
  } else {
    return; // skip anything unexpected
  }

  if (!url) return;

  const title = labelMap[key] || key;

  const card = document.createElement('div');
  card.className = 'voting-card';

  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';

  const iconDiv = document.createElement('div');
  iconDiv.className = 'card-icon';
  iconDiv.innerHTML = `<span class="emoji">${icon}</span>`;

  const labelDiv = document.createElement('div');
  labelDiv.className = 'card-label';
  labelDiv.textContent = title;

  const descDiv = document.createElement('div');
  descDiv.className = 'card-description';
  descDiv.textContent = description;

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
function renderRosterCards(rosterData, chamberLabel, container) {
  if (Array.isArray(rosterData)) {
    rosterData.forEach(entry => {
      const card = document.createElement('div');
      card.className = 'link-card';
      card.innerHTML = `
        <h4>${chamberLabel} – ${entry.party}</h4>
        <p class="card-desc">Click to view ${entry.party} members of the ${chamberLabel}.</p>
        <a href="${entry.url}" target="_blank" class="card-button">Open</a>
      `;
      container.appendChild(card);
    });
  } else if (typeof rosterData === 'object' && rosterData.url) {
    const card = document.createElement('div');
    card.className = 'link-card';
    card.innerHTML = `
      <h4>${chamberLabel}</h4>
      <p class="card-desc">Click to view ${chamberLabel} information for ${selectedState}.</p>
      <a href="${rosterData.url}" target="_blank" class="card-button">Open</a>
    `;
    container.appendChild(card);
  } else if (typeof rosterData === 'string') {
    const card = document.createElement('div');
    card.className = 'link-card';
    card.innerHTML = `
      <h4>${chamberLabel}</h4>
      <p class="card-desc">Click to view ${chamberLabel} information for ${selectedState}.</p>
      <a href="${rosterData}" target="_blank" class="card-button">Open</a>
    `;
    container.appendChild(card);
  }
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
      const normalizedState = selectedState === "Virgin Islands" ? "U.S. Virgin Islands" : selectedState;
      const links = stateLinks[normalizedState] || {};

      const labelMap = {
        bills: 'Bills',
        senateRoster: 'State Senate',
        houseRoster: 'State House',
        local: 'Local Government'
      };

      const grid = document.createElement('div');
      grid.className = 'link-grid';

      Object.entries(links).forEach(([label, value]) => {
        if (label === 'federalRaces' || value === null || value === undefined) return;
        const displayLabel = labelMap[label] || label;

        if (Array.isArray(value)) {
          value.forEach(entry => {
            if (!entry || !entry.url) return;
            const card = document.createElement('div');
            card.className = 'link-card';
            card.setAttribute('onclick', `window.open('${entry.url}', '_blank')`);
            card.innerHTML = `
              <h4>${displayLabel} – ${entry.party}</h4>
              <p class="card-desc">Click to view ${entry.party} members of the ${displayLabel}.</p>
            `;
            grid.appendChild(card);
          });
        } else if (typeof value === 'object' && value !== null && value.url) {
          const card = document.createElement('div');
          card.className = 'link-card';
          card.setAttribute('onclick', `window.open('${value.url}', '_blank')`);
          card.innerHTML = `
            <h4>${displayLabel}</h4>
            <p class="card-desc">Click to view ${displayLabel} information for ${selectedState}.</p>
          `;
          grid.appendChild(card);
        } else if (typeof value === 'string') {
          const card = document.createElement('div');
          card.className = 'link-card';
          card.setAttribute('onclick', `window.open('${value}', '_blank')`);
          card.innerHTML = `
            <h4>${displayLabel}</h4>
            <p class="card-desc">Click to view ${displayLabel} information for ${selectedState}.</p>
          `;
          grid.appendChild(card);
        }
      });

      if (grid.children.length === 0) {
        const msg = document.createElement('p');
        msg.textContent = `No state-level links available for ${selectedState}.`;
        stateBlock.appendChild(msg);
      }
      stateBlock.appendChild(grid);

      // NGA block
      const ngaBlock = document.createElement('div');
      ngaBlock.className = 'civic-block';
      ngaBlock.innerHTML = '<h2>National Governor\'s Association</h2>';

      const ngaLinks = [
        {
          label: 'NGA Leadership',
          url: 'https://www.nga.org/governors/ngaleadership/',
          desc: 'Meet the current leadership of the National Governors Association.'
        },
        {
          label: 'Council of Governors',
          url: 'https://www.nga.org/cog/',
          desc: 'Explore the bipartisan Council of Governors and its national security role.'
        },
        {
          label: 'Gubernatorial Elections',
          url: 'https://www.nga.org/governors/elections/',
          desc: 'Track upcoming and recent gubernatorial elections across the United States.'
        },
        {
          label: 'Education, Workforce and Community Investment Task Force',
          url: 'https://www.nga.org/advocacy/nga-committees/education-workforce-community-investment-task-force/',
          desc: 'See how governors are shaping education and workforce development policy.'
        },
        {
          label: 'Economic Development and Revitalization Task Force',
          url: 'https://www.nga.org/advocacy/nga-committees/economic-development-and-revitalization-task-force/',
          desc: 'Review strategies for economic growth and revitalization led by governors.'
        },
        {
          label: 'Public Health and Emergency Management Task Force',
          url: 'https://www.nga.org/advocacy/nga-committees/public-health-and-emergency-management-task-force/',
          desc: 'Understand how governors coordinate public health and emergency response.'
        }
      ];

      const ngaGrid = document.createElement('div');
      ngaGrid.className = 'link-grid';

      ngaLinks.forEach(link => {
        const card = document.createElement('div');
        card.className = 'link-card';
        card.setAttribute('onclick', `window.open('${link.url}', '_blank')`);
        card.innerHTML = `
          <h4>${link.label}</h4>
          <p class="card-desc">${link.desc}</p>
        `;
        ngaGrid.appendChild(card);
      });

      ngaBlock.appendChild(ngaGrid);

      // Federal block
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
          url: 'https://www.govtrack.us/congress/members/report-cards/2024',
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
        card.setAttribute('onclick', `window.open('${link.url}', '_blank')`);
        card.innerHTML = `
          <h4>${link.label}</h4>
          <p class="card-desc">${link.desc}</p>
        `;
        federalGrid.appendChild(card);
      });

      federalBlock.appendChild(federalGrid);

      // Append all blocks
      section.appendChild(stateBlock);
      section.appendChild(ngaBlock);
      section.appendChild(federalBlock);
      calendar.appendChild(section);
    })
    .catch(err => {
      calendar.innerHTML = '<p>Error loading civic links.</p>';
      console.error(err);
    });
}
function showCabinet() {
  fetch('/cabinet.json')
    .then(r => r.json())
    .then(data => {
      const list = document.getElementById('cabinetList');
      list.innerHTML = '';

      data.forEach(member => {
        const card = document.createElement('div');
        card.className = 'official-card';
        card.innerHTML = `
          <div class="photo-wrapper">
            <img src="${member.photo || 'assets/default-photo.png'}" 
                 alt="${member.name}" 
                 onerror="this.onerror=null;this.src='assets/default-photo.png';" />
          </div>
          <div class="official-info">
            <h3>${member.name}</h3>
            <p><strong>Office:</strong> ${member.office}</p>
          </div>
        `;
        card.onclick = () => showCabinetMember(member);
        list.appendChild(card);
      });

      openModal('cabinetModal');
    })
    .catch(err => console.error('Error loading Cabinet data:', err));
}


function showCabinetMember(member) {
  const detail = document.getElementById('cabinetMemberDetail');
  const termStartYear = member.termStart ? new Date(member.termStart).getFullYear() : '';
  const termEndYear = member.termEnd ? new Date(member.termEnd).getFullYear() : 'Present';

  detail.innerHTML = `
    <h2>${member.name}</h2>
    <p><strong>Office:</strong> ${member.office}</p>
    <p><strong>State:</strong> ${member.state || ''}</p>
    <p><strong>Party:</strong> ${member.party || ''}</p>
    <p><strong>Term:</strong> ${termStartYear}–${termEndYear}</p>
    <p><strong>Bio:</strong> ${member.bio || ''}</p>
    <p><strong>Education:</strong> ${member.education || ''}</p>
    ${member.ballotpediaLink ? `<a href="${member.ballotpediaLink}" target="_blank">Ballotpedia</a>` : ''}
    ${member.govtrackLink ? `<br><a href="${member.govtrackLink}" target="_blank">GovTrack</a>` : ''}
  `;
  openModal('cabinetMemberModal');
}

function showPolls() {
  showTab('polls');
  const pollsContainer = document.getElementById('polls-cards');
  pollsContainer.innerHTML = '';

  const suppressedForTerritories = ['State Senate', 'State House'];
  const isTerritory = ['Puerto Rico', 'U.S. Virgin Islands', 'Guam', 'American Samoa', 'Northern Mariana Islands'].includes(selectedState);

  pollCategories.forEach(category => {
    if (isTerritory && suppressedForTerritories.includes(category.label)) return;

    const card = document.createElement('div');
    card.className = 'link-card';
    card.setAttribute('onclick', `openPollModal('${category.label}')`);
    card.innerHTML = `
      <h4>${category.label}</h4>
      <p class="card-desc">Click to view ${category.label} polls.</p>
    `;
    pollsContainer.appendChild(card);
  });
}

  window.pollCategories = pollCategories;

// Map each source to its logo in /assets/
const logoMap = {
  RCP: '/assets/rcp.png',
  '270toWin': '/assets/270towin.png',
  Ballotpedia: '/assets/ballotpedia.png',
  'Cook Political': '/assets/cookpolitical.png',
  Sabato: '/assets/sabato.png',
  'AP-NORC': '/assets/apnorc.png',
  DDHQ: '/assets/ddhq.png',
  RaceToWH: '/assets/racetowh.png',
  Gallup: '/assets/gallup.png',
  Pew: '/assets/pew.png'
};

// Open poll modal with grid cards and live RCP injection
function openPollModal(categoryLabel) {
  const category = (window.pollCategories || []).find(c => c.label === categoryLabel);
  const modal = document.getElementById('pollModal');
  const modalContent = document.getElementById('pollModalContent');

  if (!category || !modal || !modalContent) {
    console.error('openPollModal: missing category or modal elements', { categoryLabel, category, modal, modalContent });
    return;
  }

  // Render grid of uniform cards with logos
  modalContent.innerHTML = `
    <h2>${category.label} Polls</h2>
    <div class="poll-grid">
      ${category.polls.map(p => `
        <div class="poll-card">
          <div class="poll-logo">
            <img src="${logoMap[p.source] || ''}" alt="${p.source} logo">
          </div>
          <div class="poll-links">
            <a href="${p.url}" target="_blank" rel="noopener">${p.name}</a>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  modal.style.display = 'block';

  // Live polling injection (kept inside so `category` is defined)
  const liveEndpoints = {
    'President': 'https://www.realclearpolling.com/latest-polls/2025',
    'U.S. Senate': 'https://www.realclearpolling.com/latest-polls/senate',
    'U.S. House': 'https://www.realclearpolling.com/latest-polls/house',
    'Governor': 'https://www.realclearpolling.com/latest-polls/governor'
  };

  const endpoint = liveEndpoints[category.label];
  if (endpoint) {
    fetch(endpoint)
      .then(res => res.text())
      .then(html => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const pollLinks = Array.from(doc.querySelectorAll('a[href*="/polls/"]'));
        const filtered = pollLinks
          .filter(link => link.textContent.trim().length > 0)
          .slice(0, 5)
          .map(link => `<li><a href="https://www.realclearpolling.com${link.getAttribute('href')}" target="_blank" rel="noopener">${link.textContent.trim()}</a></li>`);

        if (filtered.length > 0) {
          modalContent.innerHTML += `<h3>Live ${category.label} Polls</h3><ul>${filtered.join('')}</ul>`;
        }
      })
      .catch(err => console.error(`${category.label} polling fetch error:`, err));
  }

  // Close modal when clicking outside
  window.onclick = function(e) {
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  };
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
const federalOfficials = [
  {
    "name": "Donald J. Trump",
    "state": "United States",
    "party": "Republican",
    "office": "President",
    "slug": "donald-trump",
    "photo": "https://www.whitehouse.gov/wp-content/uploads/2025/01/Donald-J-Trump.jpg",
    "ballotpediaLink": "https://ballotpedia.org/Donald_Trump",
    "govtrackLink": "https://www.govtrack.us/congress/other-people/donald_trump/412733",
    "termStart": "2025-01-20",
    "termEnd": "2029-01-20",
    "contact": {
      "email": "",
      "phone": "",
      "website": "https://www.whitehouse.gov/"
    },
    "bio": "Donald J. Trump is the 47th President of the United States, inaugurated for a second term in 2025. He previously served as the 45th President from 2017 to 2021. A businessman and media figure, Trump is known for his America First platform and populist economic policies.",
    "education": "University of Pennsylvania (BS in Economics, Wharton School)",
    "endorsements": "National Rifle Association, Turning Point USA, Heritage Action, Club for Growth",
    "platform": "Border security, economic nationalism, energy independence, and restoring American sovereignty.",
    "platformFollowThrough": {
      "Border Security": "Reinstated border wall construction and expanded deportation authority via executive order.",
      "Economic Nationalism": "Issued tariffs on foreign competitors and promoted Buy American procurement policies.",
      "Energy Independence": "Approved new oil and gas leases and reversed climate-era restrictions.",
      "American Sovereignty": "Withdrew from global pacts and reasserted U.S. control over trade and immigration."
    },
    "proposals": "End birthright citizenship for children of illegal immigrants, impose tariffs on foreign automakers, and dismantle DEI mandates in federal agencies.",
    "engagement": {
      "executiveOrders2025": 31,
      "socialMediaSurge": true,
      "earnedMediaCoverage": true,
      "sources": [
        "https://www.whitehouse.gov/",
        "https://ballotpedia.org/Donald_Trump",
        "https://www.govtrack.us/congress/members/donald_trump/456872/report-card/2024"
      ]
    },
    "billsPassed": [],
    "salary": "$400,000/year",
    "predecessor": "Joe Biden",
    "electionYear": "2024"
  },
  {
    "name": "JD Vance",
    "state": "United States",
    "party": "Republican",
    "office": "Vice President",
    "slug": "jd-vance",
    "photo": "https://www.whitehouse.gov/wp-content/uploads/2025/01/jd-vance.jpg",
    "ballotpediaLink": "https://ballotpedia.org/J.D._Vance",
    "govtrackLink": "https://www.govtrack.us/congress/members/james_david_vance/456876/report-card/2024",
    "termStart": "2025-01-20",
    "termEnd": "2029-01-20",
    "contact": {
      "email": "",
      "phone": "",
      "website": "https://www.whitehouse.gov/administration/jd-vance/"
    },
    "bio": "JD Vance is the 50th Vice President of the United States, inaugurated in 2025. A former U.S. Senator from Ohio and author of 'Hillbilly Elegy,' Vance is known for his populist conservatism and advocacy for working-class Americans.",
    "education": "Ohio State University (BA), Yale Law School (JD)",
    "endorsements": "Heritage Foundation, American Principles Project, Susan B. Anthony Pro-Life America",
    "platform": "Working-class revival, tech accountability, cultural conservatism, and border enforcement.",
    "platformFollowThrough": {
      "Working-Class Revival": "Promoted trade reform and domestic manufacturing incentives during Senate tenure.",
      "Tech Accountability": "Supported antitrust scrutiny of Big Tech and online censorship reform.",
      "Cultural Conservatism": "Opposed federal funding for DEI and gender ideology in schools.",
      "Border Enforcement": "Advocated for Title 42 reinstatement and increased ICE funding."
    },
    "proposals": "Break up tech monopolies, expand vocational training, and restrict foreign land ownership.",
    "engagement": {
      "executiveOrders2025": 0,
      "socialMediaSurge": true,
      "earnedMediaCoverage": true,
      "sources": [
        "https://www.whitehouse.gov/administration/jd-vance/",
        "https://ballotpedia.org/J._D._Vance",
        "https://www.govtrack.us/congress/members/james_vance/456873/report-card/2024"
      ]
    },
    "billsPassed": [],
    "salary": "$235,100/year",
    "predecessor": "Kamala Harris",
    "electionYear": "2024"
  }
];

function renderOfficials(stateFilter = null, query = '') {
  showTab('my-officials');
  officialsContainer.innerHTML = '';
  const stateAliases = {
  "Virgin Islands": "U.S. Virgin Islands",
  "Northern Mariana Islands": "Northern Mariana Islands",
  "Puerto Rico": "Puerto Rico"
};

if (stateFilter && stateAliases[stateFilter]) {
  stateFilter = stateAliases[stateFilter];
}

  const queryLower = query.toLowerCase();
  const filterByState = query === '';

  const filteredGovs = governors.filter(o => !filterByState || o.state === stateFilter);
  const filteredLtGovs = ltGovernors.filter(o => !filterByState || o.state === stateFilter);
  const filteredSens = senators.filter(o => !filterByState || o.state === stateFilter);
  const filteredReps = houseReps.filter(o => !filterByState || o.state === stateFilter)
    .sort((a, b) => parseInt(a.district) - parseInt(b.district));
console.log("Filtered reps:", filteredReps.map(r => r.name));

 const allOfficials = [
  ...federalOfficials,
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

  const { billsSigned, ...cleanOfficial } = official;
  const contact = cleanOfficial.contact || {};
  const bills = []; // intentionally empty

  const photoSrc = cleanOfficial.photo && cleanOfficial.photo.trim() !== ''
    ? cleanOfficial.photo
    : 'assets/default-photo.png';

  modalContent.innerHTML = `
    <div class="modal-card">
      <div class="modal-photo">
        <img src="${photoSrc}" alt="${cleanOfficial.name}" onerror="this.onerror=null;this.src='assets/default-photo.png';" />
      </div>
      <div class="modal-info">
        <h2>${cleanOfficial.name}</h2>
        <p><strong>Office:</strong> ${cleanOfficial.office}</p>
        ${cleanOfficial.district ? `<p><strong>District:</strong> ${cleanOfficial.district}</p>` : ''}
        <p><strong>State:</strong> ${cleanOfficial.state}</p>
        <p><strong>Party:</strong> ${cleanOfficial.party}</p>
        <p><strong>Term:</strong> ${new Date(cleanOfficial.termStart).getFullYear()}–${new Date(cleanOfficial.termEnd).getFullYear()}</p>
        ${cleanOfficial.bio ? `<p>${cleanOfficial.bio}</p>` : ''}
        ${cleanOfficial.education ? `<p><strong>Education:</strong> ${cleanOfficial.education}</p>` : ''}
        ${cleanOfficial.platform ? `<p><strong>Platform:</strong> ${cleanOfficial.platform}</p>` : ''}
        ${cleanOfficial.platformFollowThrough
        ? `<div class="follow-through"><h3>Platform Follow-Through</h3><ul>${
        Object.entries(cleanOfficial.platformFollowThrough)
        .map(([topic, summary]) => `<li><strong>${topic}:</strong> ${summary}</li>`)
        .join('')
        }</ul></div>`
        : ''}
        ${cleanOfficial.proposals ? `<p><strong>Proposals:</strong> ${cleanOfficial.proposals}</p>` : ''}
        ${(cleanOfficial.vetoes && ['Governor', 'President'].includes(cleanOfficial.office))
        ? `<p><strong>Vetoes:</strong> ${cleanOfficial.vetoes}</p>`
        : ''}
        ${cleanOfficial.salary ? `<p><strong>Salary:</strong> ${cleanOfficial.salary}</p>` : ''}
        ${cleanOfficial.govtrackStats
        ? `<div class="govtrack-stats"><h3>Congressional Rankings</h3><ul>${
        Object.entries(cleanOfficial.govtrackStats)
        .map(([label, value]) => `<li><strong>${label.replace(/([A-Z])/g, ' $1')}:</strong> ${value}</li>`)
        .join('')
        }</ul></div>`
        : ''}
        ${cleanOfficial.website ? `<p><a href="${cleanOfficial.website}" target="_blank">Official Website</a></p>` : ''}
        ${contact.email ? `<p><strong>Email:</strong> ${contact.email}</p>` : ''}
        ${contact.phone ? `<p><strong>Phone:</strong> ${contact.phone}</p>` : ''}
        ${contact.website ? `<p><a href="${contact.website}" target="_blank">Contact Website</a></p>` : ''}
        ${cleanOfficial.ballotpediaLink ? `<p><a href="${cleanOfficial.ballotpediaLink}" target="_blank">Ballotpedia Profile</a></p>` : ''}
        ${cleanOfficial.govtrackLink
          ? `<p><a href="${cleanOfficial.govtrackLink}" target="_blank">GovTrack</a></p>`
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
    window.selectedState = selectedState;
    renderOfficials(selectedState, '');
  });
}

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  officialsContainer = document.getElementById('officials-container');
  searchBar = document.getElementById('search-bar'); // input element for Officials search
  modal = document.getElementById('modal');
  modalContent = document.getElementById('modal-content');
  closeModal = document.getElementById('close-modal');

  // Modal wiring
  closeModal.addEventListener('click', closeModalWindow);
  window.addEventListener('click', event => {
    if (event.target === modal) closeModalWindow();
  });

  // Core wiring
  wireSearchBar();
  wireStateDropdown();

  // Load officials data
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

  // Helper: clear the Officials search bar (no tab switch, no re-render)
  function closeOfficialsSearch() {
    if (!searchBar) return;
    searchBar.value = '';   // clear text
    searchBar.blur();       // remove focus
  }

  // Click-outside to clear search
  document.addEventListener('mousedown', event => {
    if (!searchBar) return;

    // If the click is outside the search bar, clear it
    if (event.target !== searchBar && !searchBar.contains(event.target)) {
      closeOfficialsSearch();
    }
  });
});
