// === GLOBAL STATE ===
let selectedState = 'North Carolina';
let governors = [];
let ltGovernors = [];
let senators = [];
let houseReps = [];
let officialsContainer = null;
let searchBar = null;

// === DATA LOADING ===
// Load all major JSON datasets at once
Promise.all([
  fetch('federalOfficials.json').then(res => res.json()),
  fetch('senators.json').then(res => res.json()),
  fetch('governors.json').then(res => res.json()),
  fetch('cabinet.json').then(res => res.json()),
  fetch('housereps.json').then(res => res.json()),
  fetch('ltgovernors.json').then(res => res.json()),
  fetch('scotus.json').then(res => res.json()),
  fetch('political-groups.json').then(res => res.json()),
  fetch('state-links.json').then(res => res.json()),
  fetch('voting-data.json').then(res => res.json())
])
.then(([federal, sens, govs, cabinet, reps, ltGovs, scotus, groups, links, voting]) => {
  // Keep global arrays filled
  governors = govs;
  ltGovernors = ltGovs;
  senators = sens;
  houseReps = reps;

  // Merge major federal data sources
  const allOfficials = [
    ...federal,
    ...cabinet,
    ...sens,
    ...reps,
    ...govs,
    ...ltGovs,
    ...scotus
  ];

  renderOfficials(selectedState, '');

  if (searchBar) {
    searchBar.addEventListener('input', e => {
      renderOfficials(selectedState, e.target.value);
    });
  }
})
.catch(err => console.error('Error loading data files:', err));

// Modal refs (Officials modal)
let officialsModal = null;
let officialsModalContent = null;
let officialsModalCloseBtn = null;

// === POLL CATEGORIES (final) ===
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

// Simple tab switcher
function showTab(id) {
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.style.display = 'none';
  });
  const activeTab = document.getElementById(id);
  if (activeTab) activeTab.style.display = 'block';
}
// === VOTING TAB ===
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

      let stateName = window.selectedState || 'North Carolina';
      if (stateName === 'Virgin Islands') stateName = 'U.S. Virgin Islands';
      const stateData = data[stateName] || null;

      if (!stateData || typeof stateData !== 'object') {
        votingCards.innerHTML = `<p>No voting information available for ${stateName}.</p>`;
        return;
      }

      console.log("Selected state:", stateName);
      console.log('Direct match result:', data[stateName]);

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
        if (!value) return;

        let url, icon, description, deadline;

        if (typeof value === 'string') {
          url = value;
          icon = '🗳️';
          description = '';
          deadline = '';
        } else if (typeof value === 'object' && value !== null) {
          ({ url, icon = '🗳️', description = '', deadline = '' } = value);
        } else {
          return;
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

// === HELPER: render roster cards (if needed) ===
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
// === HELPER: render a single Cabinet member card ===

function renderCabinetMember(member) {
  const photoSrc = member.photo && member.photo.trim() !== ''
    ? member.photo
    : 'assets/default-photo.png';

  const sealSrc = member.seal && member.seal.trim() !== ''
    ? member.seal
    : 'assets/default-seal.png';

  return `
    <div class="official-card ${member.party?.toLowerCase() || ''}">
      <div class="party-stripe"></div>
      <div class="card-body">
        <div class="photo-wrapper">
          <img src="${photoSrc}" alt="${member.name}"
               onerror="this.onerror=null;this.src='assets/default-photo.png';" />
        </div>
        <div class="official-info">
          <h3>${member.name || 'Unknown'}</h3>
          <p><strong>Position:</strong> ${member.office || 'N/A'}</p>
          <p><strong>Department:</strong> ${member.department || ''}</p>
          <p><strong>Party:</strong> ${member.party || 'N/A'}</p>
        </div>
        <div class="seal-wrapper">
          <img src="${sealSrc}" alt="${member.department || 'Seal'}"
               onerror="this.onerror=null;this.src='assets/default-seal.png';"
               class="seal" />
        </div>
      </div>
    </div>
  `;
}

// === RENDER: populate the Cabinet grid ===
function renderCabinetGrid(cabinetData) {
  const container = document.getElementById('cabinetList');
  container.innerHTML = ''; // clear any old content
  cabinetData.forEach(member => {
    const cardWrapper = document.createElement('div');
    cardWrapper.className = 'official-card';
    cardWrapper.innerHTML = renderCabinetMember(member);
    container.appendChild(cardWrapper);
  });
}
function showCabinetMemberDetail(member) {
  const detail = document.getElementById('cabinetMemberDetail');
  detail.innerHTML = `
  <div class="detail-header">
    <img src="${member.photo}" alt="${member.name || ''}" class="portrait"
         onerror="this.onerror=null;this.src='assets/default-photo.png';" />
    ${member.seal ? `<img src="${member.seal}" alt="${member.office} seal" class="seal" />` : ''}
  </div>
  <h2>${member.name || 'Unknown'}</h2>
  ...
`;

  document.getElementById('cabinetGridView').style.display = 'none';
  document.getElementById('cabinetDetailView').style.display = 'block';
}
fetch('cabinet.json')
  .then(res => res.json())
  .then(data => renderCabinetGrid(data));

// === DETAIL: show a single Cabinet member in the modal ===
function showCabinetMemberDetail(member) {
  const detail = document.getElementById('cabinetMemberDetail');
  detail.innerHTML = `
    <div class="detail-header">
      <img src="${member.photo}" alt="${member.name}" class="portrait" />
      <img src="${member.seal}" alt="${member.office} seal" class="seal" />
    </div>
    <h2>${member.name}</h2>
    <h4>${member.office}</h4>
    <p>${member.bio}</p>
  `;
  document.getElementById('cabinetGridView').style.display = 'none';
  document.getElementById('cabinetDetailView').style.display = 'block';
}

// === CIVIC TAB ===
function showCivic() {
  showTab('civic');
  const calendar = document.getElementById('calendar');
  calendar.innerHTML = '';

  const section = document.createElement('div');
  section.className = 'civic-section';

  // --- State block ---
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
        if (label === 'federalRaces' || value == null) return;
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
        } else if (typeof value === 'object' && value.url) {
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

      // --- NGA block ---
      const ngaBlock = document.createElement('div');
      ngaBlock.className = 'civic-block';
      ngaBlock.innerHTML = '<h2>National Governor\'s Association</h2>';

      const ngaLinks = [
        { label: 'NGA Leadership', url: 'https://www.nga.org/governors/ngaleadership/', desc: 'Meet the current leadership of the National Governors Association.' },
        { label: 'Council of Governors', url: 'https://www.nga.org/cog/', desc: 'Explore the bipartisan Council of Governors and its national security role.' },
        { label: 'Gubernatorial Elections', url: 'https://www.nga.org/governors/elections/', desc: 'Track upcoming and recent gubernatorial elections across the United States.' },
        { label: 'Education, Workforce and Community Investment Task Force', url: 'https://www.nga.org/advocacy/nga-committees/education-workforce-community-investment-task-force/', desc: 'See how governors are shaping education and workforce development policy.' },
        { label: 'Economic Development and Revitalization Task Force', url: 'https://www.nga.org/advocacy/nga-committees/economic-development-and-revitalization-task-force/', desc: 'Review strategies for economic growth and revitalization led by governors.' },
        { label: 'Public Health and Emergency Management Task Force', url: 'https://www.nga.org/advocacy/nga-committees/public-health-and-emergency-management-task-force/', desc: 'Understand how governors coordinate public health and emergency response.' }
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

      // --- Federal block ---
      const federalBlock = document.createElement('div');
      federalBlock.className = 'civic-block';
      federalBlock.innerHTML = '<h2>Federal Oversight & Transparency</h2>';

      const federalGrid = document.createElement('div');
      federalGrid.className = 'link-grid';

      const federalLinks = [
        { label: 'Committees', url: 'https://www.govtrack.us/congress/committees', desc: 'Explore congressional committees and their membership.' },
        { label: 'Legislator Report Cards', url: 'https://www.govtrack.us/congress/members/report-cards/2024', desc: 'See performance grades for federal legislators.' },
        { label: 'All Federal Bills', url: 'https://www.govtrack.us/congress/bills/', desc: 'Track every bill introduced in Congress.' },
        { label: 'Recent Votes', url: 'https://www.govtrack.us/congress/votes', desc: 'Review the latest recorded votes in Congress.' }
      ];

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

      // Cabinet card
      const cabinetCard = document.createElement('div');
      cabinetCard.className = 'link-card';
      cabinetCard.setAttribute('onclick', 'showCabinet()');
      cabinetCard.innerHTML = `
        <h4>Cabinet</h4>
        <p class="card-desc">View members of the President's Cabinet.</p>
      `;
      federalGrid.appendChild(cabinetCard);

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
// === CABINET MODAL LOGIC ===
function showCabinet() {
  const list = document.getElementById('cabinetList');
  const gridView = document.getElementById('cabinetGridView');
  const detailView = document.getElementById('cabinetDetailView');
  const modal = document.getElementById('cabinetModal');

  if (!list || !gridView || !detailView || !modal) {
    console.error('Cabinet modal elements missing.');
    return;
  }

  // Always start in grid mode
  gridView.style.display = 'block';
  detailView.style.display = 'none';
  list.innerHTML = '';

  fetch('/cabinet.json')
    .then(res => res.json())
    .then(members => {
      if (!Array.isArray(members)) {
        console.error('cabinet.json is not an array');
        list.innerHTML = '<p>Invalid Cabinet data format.</p>';
        modal.style.display = 'block';
        return;
      }

      members.forEach(member => {
        const card = document.createElement('div');
        card.className = 'official-card';

        const photoSrc = member.photo && member.photo.trim() !== ''
          ? member.photo
          : 'assets/default-photo.png';

        card.innerHTML = `
  <div class="photo-wrapper">
    <img src="${photoSrc}" alt="${member.name || ''}"
         onerror="this.onerror=null;this.src='assets/default-photo.png';" />
  </div>
  <div class="official-info">
    <h3>${member.name || 'Unknown'}</h3>
    <p><strong>Office:</strong> ${member.office || 'N/A'}</p>
  </div>
`;

        // Only when you click a card do we show details
        card.onclick = () => showCabinetMember(member);
        list.appendChild(card);
      });

      modal.style.display = 'block';

      // click-outside close (scoped to this modal)
      window.addEventListener('click', function cabinetClickOutside(e) {
        if (e.target === modal) {
          modal.style.display = 'none';
          window.removeEventListener('click', cabinetClickOutside);
        }
      });
    })
    .catch(err => {
      console.error('Error loading cabinet.json:', err);
      list.innerHTML = '<p>Error loading Cabinet data.</p>';
      modal.style.display = 'block';
    });
}

function showCabinetMember(member) {
  const gridView = document.getElementById('cabinetGridView');
  const detailView = document.getElementById('cabinetDetailView');
  const detail = document.getElementById('cabinetMemberDetail');

  if (!gridView || !detailView || !detail) return;

  gridView.style.display = 'none';
  detailView.style.display = 'block';

  // Handle empty termStart / termEnd safely
  const parseYear = d => {
    if (!d || d.trim() === '') return '';
    const dt = new Date(d);
    return isNaN(dt) ? '' : dt.getFullYear();
  };
  const termStartYear = parseYear(member.termStart);
  const termEndYear = parseYear(member.termEnd) || 'Present';

  detail.innerHTML = `
    <div class="detail-header">
      <img src="${member.photo}" alt="${member.name || ''}" class="portrait"
           onerror="this.onerror=null;this.src='assets/default-photo.png';" />
      ${member.seal ? `<img src="${member.seal}" alt="${member.office} seal" class="seal" />` : ''}
    </div>
    <h2>${member.name || 'Unknown'}</h2>
    <p><strong>Office:</strong> ${member.office || 'N/A'}</p>
    ${member.state ? `<p><strong>State:</strong> ${member.state}</p>` : ''}
    ${member.party ? `<p><strong>Party:</strong> ${member.party}</p>` : ''}
    ${(termStartYear || termEndYear) ? `<p><strong>Term:</strong> ${termStartYear}–${termEndYear}</p>` : ''}
    ${member.bio ? `<p><strong>Bio:</strong> ${member.bio}</p>` : ''}
    ${member.education ? `<p><strong>Education:</strong> ${member.education}</p>` : ''}
    ${member.salary ? `<p><strong>Salary:</strong> ${member.salary}</p>` : ''}
    ${member.predecessor ? `<p><strong>Predecessor:</strong> ${member.predecessor}</p>` : ''}
    ${member.contact && member.contact.website ? `<p><a href="${member.contact.website}" target="_blank">Official Website</a></p>` : ''}
    ${member.ballotpediaLink ? `<p><a href="${member.ballotpediaLink}" target="_blank">Ballotpedia</a></p>` : ''}
    ${member.govtrackLink ? `<p><a href="${member.govtrackLink}" target="_blank">GovTrack</a></p>` : ''}
  `;
}

function backToCabinetGrid() {
  const gridView = document.getElementById('cabinetGridView');
  const detailView = document.getElementById('cabinetDetailView');
  if (!gridView || !detailView) return;
  gridView.style.display = 'block';
  detailView.style.display = 'none';
}

// === POLLS TAB ===
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

// Source logos
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

function openPollModal(categoryLabel) {
  const category = (window.pollCategories || []).find(c => c.label === categoryLabel);
  const modal = document.getElementById('pollModal');
  const modalContent = document.getElementById('pollModalContent');

  if (!category || !modal || !modalContent) {
    console.error('openPollModal: missing category or modal elements', { categoryLabel, category, modal, modalContent });
    return;
  }

  // Render header and poll cards in a grid
  modalContent.innerHTML = `
    <h2>${category.label} Polls</h2>
    <div class="poll-grid">
      ${category.polls.map(p => `
        <a href="${p.url}" target="_blank" rel="noopener" class="poll-card">
          <div class="poll-logo">
            <img src="${logoMap[p.source] || ''}" alt="${p.source} logo">
          </div>
          <div class="poll-links">
            ${p.name}
          </div>
        </a>
      `).join('')}
    </div>
  `;

  modal.style.display = 'block';

  // Close modal when clicking outside
  const clickOutsideHandler = function(e) {
    if (e.target === modal) {
      modal.style.display = 'none';
      window.removeEventListener('click', clickOutsideHandler);
    }
  };
  window.addEventListener('click', clickOutsideHandler);
}

// === ORGANIZATIONS TAB ===
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
function showStartupHub() {
  showTab('startup-hub'); // makes sure only the Home Hub tab is visible

  const hubContainer = document.getElementById('hub-cards');
  if (!hubContainer) return;
  hubContainer.innerHTML = '';

  const hubItems = [
    { title: "National Broadcasting Networks", id: "national-networks" },
    { title: "Newspaper Media", id: "newspaper-media" },
    { title: "Global Politics & World News", id: "global-news" },
    { title: "Finance & Markets", id: "finance-markets" },
    { title: "Tech & Innovation", id: "tech-innovation" },
    { title: "Popular Podcasts", id: "popular-podcasts" }
  ];

  hubItems.forEach(item => {
    const card = document.createElement('div');
    card.className = 'hub-card';
    card.innerHTML = `<h3>${item.title}</h3>`;
    card.addEventListener('click', () => {
      const section = document.getElementById(item.id);
      if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    hubContainer.appendChild(card);
  });
}
// === LIVE NEWS FETCH: NBC News RSS ===

// Function to fetch and parse RSS feeds to JSON-like structure
async function fetchRSSFeed(url) {
  try {
    const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
    const data = await response.json();

    const parser = new DOMParser();
    const xml = parser.parseFromString(data.contents, "application/xml");

    const items = Array.from(xml.querySelectorAll("item")).slice(0, 5); // Top 5 stories
    return items.map(item => ({
      title: item.querySelector("title")?.textContent || "Untitled",
      link: item.querySelector("link")?.textContent || "#",
      description: item.querySelector("description")?.textContent.replace(/<[^>]+>/g, "") || "",
      // Optional image placeholder (replace or parse actual if available)
      image: "https://via.placeholder.com/150",
      name: item.querySelector("title")?.textContent || "Untitled",
      titleText: "NBC News Story"
    }));
  } catch (err) {
    console.error("RSS fetch failed:", err);
    return [];
  }
}

// === Step 1: Create a single NBC card ===
function createNBCCard(cardData) {
  const card = document.createElement('div');
  card.classList.add('official-card'); // uses your existing card styles

  card.innerHTML = `
    <div class="card-image">
      <img src="${cardData.image}" alt="${cardData.name}">
    </div>
    <div class="card-info">
      <h3 class="card-name">${cardData.name}</h3>
      <p class="card-title">${cardData.titleText || ""}</p>
      <a href="${cardData.link}" target="_blank" class="card-link">Learn More</a>
    </div>
  `;

  return card;
}

// Attach NBC click handler to load carousel dynamically
document.addEventListener("DOMContentLoaded", () => {
  const nbcCard = document.getElementById("nbc-card");
  if (nbcCard) {
    nbcCard.addEventListener("click", async () => {
      await loadNBCNewsCarousel();
      openCarouselModal(); // assumes your modal logic function
    });
  }

  // Hub nav scroll logic
  const navButtons = document.querySelectorAll('#hub-nav button');
  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const section = document.getElementById(btn.dataset.target);
      if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
});

// === Step 2: Populate NBC carousel dynamically ===
async function loadNBCNewsCarousel() {
  const feedUrl = "https://feeds.nbcnews.com/nbcnews/public/news";
  const stories = await fetchRSSFeed(feedUrl);

  const carousel = document.querySelector("#network-carousel .carousel-content");
  if (!carousel) return;

  // Clear existing content
  carousel.innerHTML = "";

  // Add cards to carousel
  stories.forEach(story => {
    const card = createNBCCard(story);
    const wrapper = document.createElement("div");
    wrapper.classList.add("carousel-item");
    wrapper.appendChild(card);
    carousel.appendChild(wrapper);
  });

  // Make carousel visible
  document.getElementById("network-carousel").style.display = "block";
}
// === SOCIAL TRENDS SECTION ===
function loadSocialTrends() {
  const socialFeed = document.getElementById('social-feed');
  if (!socialFeed) return;

  socialFeed.innerHTML = `
    <!-- Gavin Newsom Facebook -->
    <div class="social-card">
      <h3>Gavin Newsom Facebook</h3>
      <iframe 
        src="https://www.facebook.com/plugins/video.php?height=476&href=https%3A%2F%2Fwww.facebook.com%2Freel%2F4184264178567898%2F&show_text=true&width=267&t=0" 
        width="267" height="591" style="border:none;overflow:hidden" 
        scrolling="no" frameborder="0" allowfullscreen="true" 
        allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share">
      </iframe>
    </div>

    <!-- Kathy Hochul Facebook -->
    <div class="social-card">
      <h3>Kathy Hochul Facebook</h3>
      <iframe 
        src="https://www.facebook.com/plugins/video.php?height=314&href=https%3A%2F%2Fwww.facebook.com%2Freel%2F1608390750526549%2F&show_text=true&width=560&t=0" 
        width="560" height="429" style="border:none;overflow:hidden" 
        scrolling="no" frameborder="0" allowfullscreen="true" 
        allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share">
      </iframe>
    </div>

    <!-- Donald Trump Facebook -->
    <div class="social-card">
      <h3>Donald Trump Facebook</h3>
      <iframe 
        src="https://www.facebook.com/plugins/video.php?height=315&href=https%3A%2F%2Fwww.facebook.com%2Freel%2F1252240603298809%2F&show_text=true&width=560&t=0" 
        width="560" height="430" style="border:none;overflow:hidden" 
        scrolling="no" frameborder="0" allowfullscreen="true" 
        allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share">
      </iframe>
    </div>

    <!-- Chuck Schumer Facebook -->
    <div class="social-card">
      <h3>Chuck Schumer Facebook</h3>
      <iframe 
        src="https://www.facebook.com/plugins/video.php?height=476&href=https%3A%2F%2Fwww.facebook.com%2Freel%2F3151059001745750%2F&show_text=true&width=267&t=0" 
        width="267" height="591" style="border:none;overflow:hidden" 
        scrolling="no" frameborder="0" allowfullscreen="true" 
        allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share">
      </iframe>
    </div>
  `;
}
function scrollToCategory(sectionId) {
  const section = document.getElementById(sectionId);
  if (section) {
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// === FEDERAL OFFICIALS DATA (inline) ===
const federalOfficials = [
  {
    "name": "Donald J. Trump",
    "state": "United States",
    "party": "Republican",
    "office": "President",
    "slug": "donald-trump",
    "photo": "https://cdn4.volusion.store/mwceg-gjtbh/v/vspfiles/photos/OfficialPortrait-2.jpg?v-cache=1699020757",
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
    "photo": "data:image/jpeg;base64,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",
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
// === OFFICIALS RENDERING ===
function renderOfficials(stateFilter = null, query = '') {
  showTab('my-officials');
  if (!officialsContainer) {
    officialsContainer = document.getElementById('officials-container');
  }
  if (!officialsContainer) return;
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
  const filteredReps = houseReps
    .filter(o => !filterByState || o.state === stateFilter)
    .sort((a, b) => parseInt(a.district) - parseInt(b.district));
  console.log("Filtered reps:", filteredReps.map(r => r.name));

  const allOfficials = [
    ...federalOfficials,
    ...filteredGovs,
    ...filteredLtGovs,
    ...filteredSens,
    ...filteredReps
  ].filter(o =>
    (o.name || '').toLowerCase().includes(queryLower) ||
    (o.office || '').toLowerCase().includes(queryLower) ||
    (o.state || '').toLowerCase().includes(queryLower)
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

  const safeYear = d => {
    if (!d || (typeof d === 'string' && d.trim() === '')) return '';
    const dt = new Date(d);
    return isNaN(dt) ? '' : dt.getFullYear();
  };

  allOfficials.forEach(o => {
    const rawParty = (o.party || '').toLowerCase().trim();
    const normalizedParty = partyMap[rawParty] || rawParty.replace(/\s+/g, '') || 'independent';
    const photoSrc = o.photo && o.photo.trim() !== '' ? o.photo : 'assets/default-photo.png';

    const districtDisplay = o.office === 'U.S. Representative' && o.district
      ? `<p class="district-display"><strong>District:</strong> ${o.district}</p>`
      : '';

    const startYear = safeYear(o.termStart);
    const endYear = safeYear(o.termEnd) || 'Present';
    const termDisplay = (startYear || endYear) ? `${startYear}–${endYear}` : 'Present';

    const card = document.createElement('div');
    card.className = `official-card ${normalizedParty}`;
  card.innerHTML = `
  <div class="party-stripe"></div>
  <div class="card-body">
    <div class="photo-wrapper">
      <img src="${photoSrc}" alt="${o.name}"
           onerror="this.onerror=null;this.src='assets/default-photo.png';" />
    </div>
    <div class="official-info">
      <h3>${o.name || 'Unknown'}</h3>
      <p><strong>Position:</strong> ${o.office || 'N/A'}</p>
      ${districtDisplay}
      <p><strong>State:</strong> ${o.state || 'United States'}</p>
      <p><strong>Term:</strong> ${termDisplay}</p>
      <p><strong>Party:</strong> ${o.party || 'N/A'}</p>
    </div>
  </div>
`;
    card.addEventListener('click', () => openOfficialModal(o));
    officialsContainer.appendChild(card);
  });
}

// === OFFICIALS MODAL ===
function openOfficialModal(official) {
  const modal = document.getElementById('officials-modal');
  const modalContent = document.getElementById('officials-content');
  if (!modal || !modalContent) return;

  const { billsSigned, ...cleanOfficial } = official;
  const contact = cleanOfficial.contact || {};

  const photoSrc = cleanOfficial.photo && cleanOfficial.photo.trim() !== ''
    ? cleanOfficial.photo
    : 'assets/default-photo.png';

  const safeYear = d => {
    if (!d || (typeof d === 'string' && d.trim() === '')) return '';
    const dt = new Date(d);
    return isNaN(dt) ? '' : dt.getFullYear();
  };
  const startYear = safeYear(cleanOfficial.termStart);
  const endYear = safeYear(cleanOfficial.termEnd) || 'Present';
  const termDisplay = (startYear || endYear) ? `${startYear}–${endYear}` : 'Present';

  modalContent.innerHTML = `
    <div class="modal-card">
      <div class="modal-photo">
        <img src="${photoSrc}" alt="${cleanOfficial.name || ''}" onerror="this.onerror=null;this.src='assets/default-photo.png';" />
      </div>
      <div class="modal-info">
        <h2>${cleanOfficial.name || 'Unknown'}</h2>
        <p><strong>Office:</strong> ${cleanOfficial.office || 'N/A'}</p>
        ${cleanOfficial.district ? `<p><strong>District:</strong> ${cleanOfficial.district}</p>` : ''}
        <p><strong>State:</strong> ${cleanOfficial.state || 'United States'}</p>
        <p><strong>Party:</strong> ${cleanOfficial.party || 'N/A'}</p>
        <p><strong>Term:</strong> ${termDisplay}</p>
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
        ${cleanOfficial.govtrackLink ? `<p><a href="${cleanOfficial.govtrackLink}" target="_blank">GovTrack</a></p>` : ''}
      </div>
    </div>
  `;

  modal.style.display = 'block';

  // Click-outside-to-close (scoped handler)
  const clickOutsideHandler = function(event) {
    if (event.target === modal) {
      modal.style.display = 'none';
      window.removeEventListener('click', clickOutsideHandler);
    }
  };
  window.addEventListener('click', clickOutsideHandler);
}

// Safe close function that accepts optional id (defaults to officials modal)
function closeModalWindow(id = 'officials-modal') {
  const el = document.getElementById(id);
  if (!el) {
    console.warn(`closeModalWindow: no element found with id "${id}"`);
    return;
  }
  el.style.display = 'none';
}

// === SEARCH BAR WIRING ===
function wireSearchBar() {
  if (!searchBar) {
    searchBar = document.getElementById('search-bar');
  }
  if (!searchBar) return;

  searchBar.addEventListener('input', () => {
    const query = searchBar.value.trim();
    renderOfficials(null, query);
  });
}
// ==== HOME HUB NAV ====

function showStartupHub() {
  showTab('startup-hub');
}

// Initialize sticky nav
function initHubNav() {
  const navButtons = document.querySelectorAll('#hub-nav button');

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const section = document.getElementById(btn.dataset.target);
      if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // Optional: highlight active section on scroll
  const sections = Array.from(navButtons).map(btn =>
    document.getElementById(btn.dataset.target)
  );

  window.addEventListener('scroll', () => {
    const scrollPos = window.scrollY + 60; // adjust for sticky nav height
    sections.forEach((sec, idx) => {
      if (sec.offsetTop <= scrollPos && sec.offsetTop + sec.offsetHeight > scrollPos) {
        navButtons.forEach(b => b.classList.remove('active'));
        navButtons[idx].classList.add('active');
      }
    });
  });
}
// --- National Networks Carousel Logic ---
document.addEventListener('DOMContentLoaded', () => {
  const cards = document.querySelectorAll('#national-networks .info-card');
  const carouselContainer = document.getElementById('network-carousel');
  const carouselContent = document.querySelector('.carousel-content');
  const seeAllLink = document.getElementById('see-all-link');

  const demoData = {
    nbc: {
      url: "https://www.nbcnews.com",
      items: [] // live RSS will populate
    },
    abc: {
      url: "https://abcnews.go.com",
      items: [
        { title: "Latest headlines across the U.S.", link: "https://abcnews.go.com" },
        { title: "2024 campaign fact checks", link: "https://abcnews.go.com" },
        { title: "Global conflicts timeline", link: "https://abcnews.go.com" },
        { title: "Business and economy updates", link: "https://abcnews.go.com" },
        { title: "Health and science news", link: "https://abcnews.go.com" }
      ]
    },
    cbs: {
      url: "https://www.cbsnews.com",
      items: [
        { title: "Capitol Hill roundup", link: "https://www.cbsnews.com" },
        { title: "International report insights", link: "https://www.cbsnews.com" },
        { title: "CBS Evening News summaries", link: "https://www.cbsnews.com" },
        { title: "Market watch and analysis", link: "https://www.cbsnews.com" },
        { title: "Investigative stories", link: "https://www.cbsnews.com" }
      ]
    },
    fox: {
      url: "https://www.foxnews.com",
      items: [
        { title: "Political briefings and debates", link: "https://www.foxnews.com" },
        { title: "Business trends and outlook", link: "https://www.foxnews.com" },
        { title: "National alerts and updates", link: "https://www.foxnews.com" },
        { title: "Tech and science stories", link: "https://www.foxnews.com" },
        { title: "Opinion highlights", link: "https://www.foxnews.com" }
      ]
    },
    cnn: {
      url: "https://www.cnn.com",
      items: [
        { title: "World events and perspectives", link: "https://www.cnn.com" },
        { title: "Election updates", link: "https://www.cnn.com" },
        { title: "Spotlight interviews", link: "https://www.cnn.com" },
        { title: "International news digest", link: "https://www.cnn.com" },
        { title: "Breaking headlines", link: "https://www.cnn.com" }
      ]
    }
  };

  cards.forEach(card => {
    card.addEventListener('click', () => {
      const source = card.dataset.source;

    // --- NBC Live RSS Carousel ---
if (source === 'nbc') {
  carouselContent.innerHTML = ''; // clear previous items

  const rssUrl = 'https://feeds.nbcnews.com/nbcnews/public/news';
  const corsProxy = 'https://corsproxy.io/?' + encodeURIComponent(rssUrl);

  fetch(corsProxy)
    .then(response => response.text())
    .then(str => {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(str, "text/xml");
      const items = xmlDoc.querySelectorAll('item');

      items.forEach((item, idx) => {
        if (idx >= 5) return; // top 5 only
        const title = item.querySelector('title')?.textContent || "No title";
        const link = item.querySelector('link')?.textContent || "#";
        const slide = document.createElement('div');
        slide.className = 'carousel-item';
        slide.innerHTML = `<a href="${link}" target="_blank">${title}</a>`;
        carouselContent.appendChild(slide);
      });

      seeAllLink.href = 'https://www.nbcnews.com/';
      carouselContainer.style.display = 'flex';

      // Smooth scroll adjustment
      const offset = carouselContainer.getBoundingClientRect().top + window.scrollY - 120;
      window.scrollTo({ top: offset, behavior: 'smooth' });
    })
    .catch(err => {
      console.error("NBC RSS fetch failed:", err);
      carouselContent.innerHTML = '<p>Failed to load live stories.</p>';
      carouselContainer.style.display = 'flex';
    });

  return; // exit early since NBC is handled
}

// --- NBC Live RSS Carousel ---
if (source === 'nbc') {
  carouselContent.innerHTML = ''; // clear previous items
  const rssUrl = 'https://feeds.nbcnews.com/nbcnews/public/news';
  const corsProxy = 'https://corsproxy.io/?' + encodeURIComponent(rssUrl);

  fetch(corsProxy)
    .then(response => response.text())
    .then(str => {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(str, "text/xml");
      const items = xmlDoc.querySelectorAll('item');

      items.forEach((item, idx) => {
        if (idx >= 5) return; // top 5 only
        const title = item.querySelector('title')?.textContent || "No title";
        const link = item.querySelector('link')?.textContent || "#";
        const slide = document.createElement('div');
        slide.className = 'carousel-item';
        slide.innerHTML = `<a href="${link}" target="_blank">${title}</a>`;
        carouselContent.appendChild(slide);
      });

      seeAllLink.href = 'https://www.nbcnews.com/';
      carouselContainer.style.display = 'flex';

      // Smooth scroll adjustment
      const offset = carouselContainer.getBoundingClientRect().top + window.scrollY - 120;
      window.scrollTo({ top: offset, behavior: 'smooth' });
    })
    .catch(err => {
      console.error("NBC RSS fetch failed:", err);
      carouselContent.innerHTML = '<p>Failed to load live stories.</p>';
      carouselContainer.style.display = 'flex';
    });

  return; // exit early since NBC is handled
}

// --- Static demo for other networks ---
const data = demoData[source];
if (data) {
  carouselContent.innerHTML = data.items
    .map(item => `<div class="carousel-item"><a href="${item.link}" target="_blank">${item.title}</a></div>`)
    .join("");

  seeAllLink.href = data.url;
  carouselContainer.style.display = 'flex';

  // Smooth scroll adjustment
  const offset = carouselContainer.getBoundingClientRect().top + window.scrollY - 120;
  window.scrollTo({ top: offset, behavior: 'smooth' });
}
