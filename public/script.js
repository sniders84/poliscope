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
      console.log("Selected state:", selectedState);
console.log("Resolved links:", stateLinks[selectedState]);
console.log("Available keys:", Object.keys(stateLinks));

    const normalizedState = selectedState === "Virgin Islands" ? "U.S. Virgin Islands" : selectedState;
    const links = stateLinks[normalizedState] || {};

      const labelMap = {
        bills: 'Bills',
        senateRoster: 'State Senate',
        houseRoster: 'State House',
        local: 'Local Government'
      };
console.log("Selected state:", selectedState);
console.log("Available keys:", Object.keys(stateLinks));
console.log("Resolved links:", stateLinks[selectedState]);

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
      card.innerHTML = `
        <h4>${displayLabel} – ${entry.party}</h4>
        <p class="card-desc">Click to view ${entry.party} members of the ${displayLabel}.</p>
        <a href="${entry.url}" target="_blank" class="card-button">Open</a>
      `;
      grid.appendChild(card);
    });
  } else if (typeof value === 'object' && value !== null && value.url) {
    const card = document.createElement('div');
    card.className = 'link-card';
    card.innerHTML = `
      <h4>${displayLabel}</h4>
      <p class="card-desc">Click to view ${displayLabel} information for ${selectedState}.</p>
      <a href="${value.url}" target="_blank" class="card-button">Open</a>
    `;
    grid.appendChild(card);
  } else if (typeof value === 'string') {
    const card = document.createElement('div');
    card.className = 'link-card';
    card.innerHTML = `
      <h4>${displayLabel}</h4>
      <p class="card-desc">Click to view ${displayLabel} information for ${selectedState}.</p>
      <a href="${value}" target="_blank" class="card-button">Open</a>
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
  card.innerHTML = `
    <h4>${link.label}</h4>
    <p class="card-desc">${link.desc}</p>
    <a href="${link.url}" target="_blank" class="card-button">Open</a>
  `;
  ngaGrid.appendChild(card);
});

ngaBlock.appendChild(ngaGrid);

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
        card.innerHTML = `
          <h4>${link.label}</h4>
          <p class="card-desc">${link.desc}</p>
          <a href="${link.url}" target="_blank" class="card-button">Open</a>
        `;
        federalGrid.appendChild(card);
      });

      federalBlock.appendChild(federalGrid);
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
function showPolls() {
  showTab('polls');
  const pollsContainer = document.getElementById('polls-cards');
  pollsContainer.innerHTML = '';

  const pollCategories = [
    {
      label: 'President',
      polls: [
        { name: 'Presidential Approval & Matchups', url: 'https://www.realclearpolling.com/latest-polls/2025' }
      ]
    },
    {
      label: 'Vice President',
      polls: [
        { name: 'JD Vance Favorability Analysis', url: 'https://www.realclearpolling.com/stories/analysis/from-controversy-to-popularity-vances-rise-in-favorability' }
      ]
    },
    {
      label: 'Governor',
      polls: [
        { name: '2025 Governor Polls Overview', url: 'https://www.realclearpolling.com/latest-polls/2025' },
        { name: 'Virginia & New Jersey Governor Races', url: 'https://www.realclearpolling.com/polls/governor/general/2025/new-jersey/sherrill-vs-ciattarelli' }
      ]
    },
    {
      label: 'U.S. Senate',
      polls: [
        { name: '2026 Senate Polls', url: 'https://www.realclearpolling.com/latest-polls/senate' },
        { name: 'Senate Forecasts – 270toWin', url: 'https://www.270towin.com/polls/latest-2026-senate-election-polls/' }
      ]
    },
    {
      label: 'U.S. House',
      polls: [
        { name: 'Generic Congressional Ballot', url: 'https://www.realclearpolling.com/latest-polls/house' },
        { name: 'Toss-Up House Races', url: 'https://www.270towin.com/news/2024/11/05/27-house-races-rated-toss-favored-change-parties_1675.html' }
      ]
    },
    {
      label: 'State Senate',
      polls: [
        { name: 'State Legislative Special Elections', url: 'https://www.270towin.com/content/2025-election-results-special-elections-congress-state-legislatures-georgia-psc' }
      ]
    },
    {
      label: 'State House',
      polls: [
        { name: 'Virginia House of Delegates', url: 'https://www.270towin.com/content/2025-election-results-virginia-governor-attorney-general-house-of-delegates' }
      ]
    }
  ];

  pollCategories.forEach(category => {
    const suppressedForTerritories = ['State Senate', 'State House'];
const isTerritory = ['Puerto Rico', 'U.S. Virgin Islands', 'Guam', 'American Samoa', 'Northern Mariana Islands'].includes(selectedState);

pollCategories.forEach(category => {
  if (isTerritory && suppressedForTerritories.includes(category.label)) return;

  const card = document.createElement('div');
  card.className = 'link-card';
  card.innerHTML = `
    <h4>${category.label}</h4>
    <p class="card-desc">Click to view ${category.label} polls.</p>
    <button class="card-button" onclick="openPollModal('${category.label}')">Open</button>
  `;
  pollsContainer.appendChild(card);
});

  window.pollCategories = pollCategories;
}
function openPollModal(categoryLabel) {
  const modal = document.getElementById('polls-modal');
  const modalContent = document.getElementById('polls-content');
  const category = window.pollCategories.find(c => c.label === categoryLabel);
  if (!category) return;

  modalContent.innerHTML = `
    <h2>${category.label} Polls</h2>
    <ul>
      ${category.polls.map(p => `<li><a href="${p.url}" target="_blank">${p.name}</a></li>`).join('')}
    </ul>
  `;
  modal.style.display = 'block';
// Optional: Hook for dynamic poll injection
if (category.label === 'President') {
  fetch('https://www.realclearpolling.com/latest-polls/2025')
    .then(res => res.text())
    .then(html => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const pollLinks = Array.from(doc.querySelectorAll('a[href*="/polls/"]'));

      const filtered = pollLinks
        .filter(link => link.textContent.trim().length > 0)
        .slice(0, 5)
        .map(link => `<li><a href="https://www.realclearpolling.com${link.getAttribute('href')}" target="_blank">${link.textContent.trim()}</a></li>`);

      if (filtered.length > 0) {
        modalContent.innerHTML += `<h3>Live Polls</h3><ul>${filtered.join('')}</ul>`;
      }
    })
    .catch(err => console.error('Polling fetch error:', err));
}
if (category.label === 'U.S. Senate') {
  fetch('https://www.realclearpolling.com/latest-polls/senate')
    .then(res => res.text())
    .then(html => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const pollLinks = Array.from(doc.querySelectorAll('a[href*="/polls/"]'));

      const filtered = pollLinks
        .filter(link => link.textContent.trim().length > 0)
        .slice(0, 5)
        .map(link => `<li><a href="https://www.realclearpolling.com${link.getAttribute('href')}" target="_blank">${link.textContent.trim()}</a></li>`);

      if (filtered.length > 0) {
        modalContent.innerHTML += `<h3>Live Senate Polls</h3><ul>${filtered.join('')}</ul>`;
      }
    })
    .catch(err => console.error('Senate polling fetch error:', err));
}
if (category.label === 'U.S. House') {
  fetch('https://www.realclearpolling.com/latest-polls/house')
    .then(res => res.text())
    .then(html => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const pollLinks = Array.from(doc.querySelectorAll('a[href*="/polls/"]'));

      const filtered = pollLinks
        .filter(link => link.textContent.trim().length > 0)
        .slice(0, 5)
        .map(link => `<li><a href="https://www.realclearpolling.com${link.getAttribute('href')}" target="_blank">${link.textContent.trim()}</a></li>`);

      if (filtered.length > 0) {
        modalContent.innerHTML += `<h3>Live House Polls</h3><ul>${filtered.join('')}</ul>`;
      }
    })
    .catch(err => console.error('House polling fetch error:', err));
}
if (category.label === 'Governor') {
  fetch('https://www.realclearpolling.com/latest-polls/governor')
    .then(res => res.text())
    .then(html => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const pollLinks = Array.from(doc.querySelectorAll('a[href*="/polls/"]'));

      const filtered = pollLinks
        .filter(link => link.textContent.trim().length > 0)
        .slice(0, 5)
        .map(link => `<li><a href="https://www.realclearpolling.com${link.getAttribute('href')}" target="_blank">${link.textContent.trim()}</a></li>`);

      if (filtered.length > 0) {
        modalContent.innerHTML += `<h3>Live Governor Polls</h3><ul>${filtered.join('')}</ul>`;
      }
    })
    .catch(err => console.error('Governor polling fetch error:', err));
}

  window.onclick = function(event) {
    if (event.target === modal) {
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
    "photo": "https://upload.wikimedia.org/wikipedia/commons/5/56/Donald_Trump_official_portrait.jpg",
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
  officialsContainer = document.getElementById('officials-container');
  searchBar = document.getElementById('search-bar');
  modal = document.getElementById('modal');
  modalContent = document.getElementById('modal-content');
  closeModal = document.getElementById('close-modal');

  document.getElementById('polls-tab').addEventListener('click', showPolls);

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
