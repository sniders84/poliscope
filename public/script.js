// === FAVORITES STORAGE & HELPERS (FINAL & PERSISTENT) ===
window.favorites = JSON.parse(localStorage.getItem('favorites')) || {
  podcasts: [],
  shows: []
};

// Check if title is favorited
function isFavorite(type, title) {
  return window.favorites[type]?.includes(title);
}

// Toggle favorite on/off
function toggleFavorite(type, title) {
  if (!window.favorites[type]) window.favorites[type] = [];

  const index = window.favorites[type].indexOf(title);

  if (index > -1) {
    // remove
    window.favorites[type].splice(index, 1);
  } else {
    // add
    window.favorites[type].push(title);
  }

  // Save the updated favorites to localStorage
  localStorage.setItem('favorites', JSON.stringify(window.favorites));

  // Re-render Podcasts & Shows if visible
  const tab = document.getElementById("podcasts-shows");
  if (tab && tab.style.display !== "none") {
    showPodcastsShows();
  }

  // Return true if now favorited, false if removed
  return index === -1;
}

// Utility: update button text + style
function updateFavoriteButton(btn, isFavorited) {
  if (isFavorited) {
    btn.textContent = '✖ Remove';
    btn.classList.add('is-remove');
  } else {
    btn.textContent = '☆ Favorite';
    btn.classList.remove('is-remove');
  }
}

// === GLOBAL STATE ===
let selectedState = 'North Carolina';
let governors = [];
let ltGovernors = [];
let senators = [];
let houseReps = [];
let officialsContainer = null;
let searchBar = null;

// === DATA LOADING ===
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
  governors = govs;
  ltGovernors = ltGovs;
  senators = sens;
  houseReps = reps;

  window.allOfficials = [
  ...federal,
  ...cabinet,
  ...sens,
  ...reps,
  ...govs,
  ...ltGovs,
  ...scotus
];

  if (searchBar) {
    searchBar.addEventListener('input', e => {
      renderOfficials(selectedState, e.target.value);
    });
  }
})
.catch(err => console.error('Error loading data files:', err));

// === PODCASTS & SHOWS DATA ===
let podcastsData = [];
let showsData = [];

Promise.all([
  fetch('podcasts.json').then(res => res.json()),
  fetch('shows.json').then(res => res.json())
])
.then(([podcasts, shows]) => {
  podcastsData = podcasts;
  showsData = shows;
})
.catch(err => console.error('Error loading podcasts or shows JSON:', err));

// === Tab switcher ===
function showTab(id) {
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.style.display = 'none';
  });
  const activeTab = document.getElementById(id);
  if (activeTab) activeTab.style.display = 'block';

  document.querySelectorAll('nav .tab').forEach(btn => {
    btn.classList.remove('active');
  });
  const clickedBtn = document.querySelector(`nav .tab[data-tab="${id}"]`);
  if (clickedBtn) clickedBtn.classList.add('active');
}

function showStartupHub() { showTab('startup-hub'); }
function showQuizzes() { showTab('quizzes'); }

// Officials tab stub
function renderOfficials(state, filter) {
  console.log("renderOfficials called with", state, filter);
  // TODO: implement actual rendering logic for officials
}

// === Podcasts & Shows tab renderer ===
function showPodcastsShows() {
  showTab('podcasts-shows');

  const container = document.getElementById('podcasts-cards');
  if (!container) return;
  container.innerHTML = '';

  const renderSection = (titleText, items, type) => {
    const section = document.createElement('div');
    section.className = 'podcast-show-section';

    const header = document.createElement('div');
    header.className = "section-header open";

    const title = document.createElement('h3');
    title.textContent = titleText;

    const arrow = document.createElement('span');
    arrow.className = "section-arrow";
    arrow.textContent = "▼";

    header.appendChild(title);
    header.appendChild(arrow);
    section.appendChild(header);

    const body = document.createElement('div');
    body.className = "section-body open";

    const grid = document.createElement('div');
    grid.className = 'podcast-show-grid';

    if (!Array.isArray(items) || items.length === 0) {
      const msg = document.createElement('p');
      msg.textContent = `No ${titleText.toLowerCase()} available.`;
      grid.appendChild(msg);
    } else {
      items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'podcast-show-card';

        const logoPath = item.logo_slug ? `assets/${item.logo_slug}` : 'assets/default-logo.png';

        card.innerHTML = `
          <div class="logo-wrapper" role="button" title="Open ${item.title}">
            <img src="${logoPath}" alt="${item.title} logo"
                 onerror="this.onerror=null;this.src='assets/default-logo.png';" />
          </div>
          <div class="card-content">
            <h4 class="card-title">${item.title}</h4>
            <p class="category">${item.category || ''} – ${item.source || ''}</p>
            <p class="descriptor">${item.descriptor || ''}</p>
            <div class="card-actions">
              <button class="favorite-btn" aria-label="favorite"></button>
            </div>
          </div>
        `;

        const logoBtn = card.querySelector('.logo-wrapper');
        if (logoBtn && item.official_url) {
          logoBtn.addEventListener('click', () => window.open(item.official_url, '_blank'));
        }

        const favBtn = card.querySelector('.favorite-btn');
        if (favBtn) {
          const isFav = isFavorite(item.type || type, item.title);
          updateFavoriteButton(favBtn, isFav);
          favBtn.addEventListener('click', e => {
            e.stopPropagation();
            const nowFav = toggleFavorite(item.type || type, item.title);
            updateFavoriteButton(favBtn, nowFav);
          });
        }

        grid.appendChild(card);
      });
    }

    body.appendChild(grid);
    section.appendChild(body);

    header.addEventListener('click', () => {
      const isOpen = body.classList.contains("open");
      if (isOpen) {
        body.classList.remove("open");
        body.classList.add("closed");
        header.classList.remove("open");
        arrow.textContent = "▶";
      } else {
        body.classList.remove("closed");
        body.classList.add("open");
        header.classList.add("open");
        arrow.textContent = "▼";
      }
    });

    return section;
  };

  // Favorites section
  const favoriteItems = [];
  window.favorites.podcasts.forEach(title => {
    const item = podcastsData.find(p => p.title === title);
    if (item) favoriteItems.push({ ...item, type: 'podcasts' });
  });
  window.favorites.shows.forEach(title => {
    const item = showsData.find(s => s.title === title);
    if (item) favoriteItems.push({ ...item, type: 'shows' });
  });

  container.appendChild(renderSection('Favorites', favoriteItems, 'favorites'));
  container.appendChild(renderSection('Podcasts', podcastsData || [], 'podcasts'));
  container.appendChild(renderSection('Shows', showsData || [], 'shows'));

  // Search filter
  const tabSearch = document.getElementById('podcasts-search-bar');
  if (tabSearch) {
    const handler = () => {
      const term = tabSearch.value.toLowerCase().trim();
      container.querySelectorAll('.podcast-show-card').forEach(card => {
        const title = (card.querySelector('.card-title')?.textContent || '').toLowerCase();
        const desc = (card.querySelector('.descriptor')?.textContent || '').toLowerCase();
        card.style.display = (title.includes(term) || desc.includes(term)) ? '' : 'none';
      });
    };
    tabSearch.addEventListener('input', handler);
  }
}

// === POLL CATEGORIES (authoritative sources) ===
const pollCategories = [
  {
    label: "President",
    polls: [
      { name: "Presidential Approval Index", source: "Ballotpedia", logo: "ballotpedia.png", url: "https://ballotpedia.org/Ballotpedia%27s_Polling_Index:_Presidential_approval_rating" },
      { name: "Polling Tracker", source: "AP-NORC", logo: "apnorc.png", url: "https://apnews.com/projects/polling-tracker/" },
      { name: "Approval Polls", source: "RealClearPolling", logo: "rcp.png", url: "https://www.realclearpolling.com/latest-polls/president" },
      { name: "Democratic Primary Polls", source: "270toWin", logo: "270towin.png", url: "https://www.270towin.com/2026-democratic-presidential-primary-polls/" },
      { name: "Republican Primary Polls", source: "270toWin", logo: "270towin.png", url: "https://www.270towin.com/2026-republican-presidential-primary-polls/" }
    ]
  },
  {
    label: "Governor",
    polls: [
      { name: "Governor Polls", source: "270toWin", logo: "270towin.png", url: "https://www.270towin.com/polls/latest-2026-governor-election-polls/" },
      { name: "Governor Polls", source: "RealClearPolling", logo: "rcp.png", url: "https://www.realclearpolling.com/latest-polls/governor" },
      { name: "Governor Polls", source: "Race to the WH", logo: "racetowh.png", url: "https://www.racetothewh.com/governor/26polls" },
      { name: "Governor Ratings", source: "Sabato’s Crystal Ball", logo: "sabato.png", url: "https://centerforpolitics.org/crystalball/2025-governor/" }
    ]
  },
  {
    label: "Senate",
    polls: [
      { name: "Senate Polls", source: "270toWin", logo: "270towin.png", url: "https://www.270towin.com/polls/latest-2026-senate-election-polls/" },
      { name: "Senate Polls", source: "RealClearPolling", logo: "rcp.png", url: "https://www.realclearpolling.com/latest-polls/senate" },
      { name: "Senate Polls", source: "Race to the WH", logo: "racetowh.png", url: "https://www.racetothewh.com/senate/26polls" },
      { name: "Senate Ratings", source: "Sabato’s Crystal Ball", logo: "sabato.png", url: "https://centerforpolitics.org/crystalball/2026-senate/" }
    ]
  },
  {
    label: "House",
    polls: [
      { name: "House Polls", source: "270toWin", logo: "270towin.png", url: "https://www.270towin.com/polls/latest-2026-house-election-polls/index.php" },
      { name: "House Polls", source: "RealClearPolling", logo: "rcp.png", url: "https://www.realclearpolling.com/latest-polls/house" },
      { name: "House Polls", source: "Race to the WH", logo: "racetowh.png", url: "https://www.racetothewh.com/house/polls/24" },
      { name: "House Ratings", source: "Sabato’s Crystal Ball", logo: "sabato.png", url: "https://centerforpolitics.org/crystalball/2026-house/" }
    ]
  }
];

// === COMMUNITY TAB ===
function showCommunity() {
  showTab('community');
  // No dynamic fetch needed — cards are static HTML
}

function showPolls() {
  showTab('polls');

  // === Polls Section (unchanged) ===
  const pollsContainer = document.getElementById('polls-cards');
  if (pollsContainer) {
    pollsContainer.innerHTML = '';

    pollCategories.forEach(category => {
      const section = document.createElement('div');
      section.className = 'poll-section';

      const header = document.createElement('h3');
      header.textContent = category.label;
      section.appendChild(header);

      const grid = document.createElement('div');
      grid.className = 'poll-grid';

      category.polls.forEach(poll => {
        const card = document.createElement('a');
        card.className = 'poll-card';
        card.href = poll.url;
        card.target = '_blank';
        card.rel = 'noopener noreferrer';
        card.innerHTML = `
          <div class="poll-logo"><img src="assets/${poll.logo}" alt="${poll.source} logo"></div>
          <h4>${poll.name}</h4>
          <p class="card-desc">Source: ${poll.source}</p>
        `;
        grid.appendChild(card);
      });

      section.appendChild(grid);
      pollsContainer.appendChild(section);
    });

    // Approval Polling card
    const approvalSection = document.createElement('div');
    approvalSection.className = 'poll-section';

    const approvalHeader = document.createElement('h3');
    approvalHeader.textContent = 'APPROVAL POLLS';
    approvalSection.appendChild(approvalHeader);

    const approvalGrid = document.createElement('div');
    approvalGrid.className = 'poll-grid';

    const approvalCard = document.createElement('a');
    approvalCard.className = 'poll-card';
    approvalCard.href = 'https://www.isidewith.com/approval-polling/';
    approvalCard.target = '_blank';
    approvalCard.rel = 'noopener noreferrer';
    approvalCard.innerHTML = `
      <div class="poll-logo"><img src="assets/polls.jpeg" alt="Political Approval Polling"></div>
      <h4>Political Approval Polling</h4>
      <p class="card-desc">See how voters rate political leaders with the latest approval polls, trend data, and comparisons across parties, regions, and issues.</p>
    `;
    approvalGrid.appendChild(approvalCard);

    approvalSection.appendChild(approvalGrid);
    pollsContainer.appendChild(approvalSection);
  }

  // === Elections Header ===
  const pollsTab = document.getElementById('polls');
  if (pollsTab) {
    const oldHeader = pollsTab.querySelector('#elections-main-header');
    if (oldHeader) oldHeader.remove();

    const electionsSection = document.createElement('div');
    electionsSection.className = 'poll-section';
    electionsSection.id = 'elections-main-header';

    const electionsHeader = document.createElement('h3');
    electionsHeader.textContent = 'ELECTIONS - LOCAL, STATE, FEDERAL';
    electionsSection.appendChild(electionsHeader);

    const pollsCards = document.getElementById('polls-cards');
    if (pollsCards && pollsCards.nextSibling) {
      pollsCards.parentNode.insertBefore(electionsSection, pollsCards.nextSibling);
    } else {
      pollsTab.appendChild(electionsSection);
    }
  }

  // === Elections Cards ===
  const electionsContainer = document.getElementById('elections-cards');
  if (electionsContainer) {
    electionsContainer.innerHTML = '';
    electionsContainer.className = 'poll-grid'; // Consistent grid wrapping

    const createCardWithLogo = (title, logoSrc, links) => {
      const card = document.createElement('div');
      card.className = 'elections-card';

      let linksHtml = '<ul>';
      links.forEach(link => {
        linksHtml += `<li><a href="${link.url}" target="_blank" rel="noopener noreferrer">${link.text}</a></li>`;
      });
      linksHtml += '</ul>';

      card.innerHTML = `
        <div class="poll-logo"><img src="${logoSrc}" alt="${title}"></div>
        <h3>${title}</h3>
        ${linksHtml}
      `;
      return card;
    };

    // Upcoming Elections – with logo
    electionsContainer.appendChild(createCardWithLogo('Upcoming Elections', 'assets/ballotpedia-election.png', [
      { text: 'My Election Lookup Tool', url: 'https://ballotpedia.org/Sample_Ballot_Lookup' },
      { text: 'Full Elections Calendar', url: 'https://ballotpedia.org/Elections_calendar' }
    ]));

    // Recent Results – with logo
    electionsContainer.appendChild(createCardWithLogo('Recent Results', 'assets/ballotpedia-results.png', [
      { text: '2025 Election Results', url: 'https://ballotpedia.org/Election_results,_2025' },
      { text: '2024 Election Results', url: 'https://ballotpedia.org/Election_results,_2024' }
    ]));

    // Most Competitive Races – with logo
    electionsContainer.appendChild(createCardWithLogo('Most Competitive Races', 'assets/ballotpedia-competitive.jpeg', [
      { text: '2026 Senate Battlegrounds', url: 'https://ballotpedia.org/United_States_Senate_elections,_2026#Battlegrounds' },
      { text: '2026 House Battlegrounds', url: 'https://ballotpedia.org/United_States_House_of_Representatives_elections,_2026#Battlegrounds' },
      { text: '2025 Governor Elections', url: 'https://ballotpedia.org/Gubernatorial_elections,_2025' }
    ]));

    // Voter Guide cards (already have logos)
    const createVoterGuideCard = (year) => {
      const card = document.createElement('div');
      card.className = 'elections-card';

      const positions = [
        { name: 'President', path: '/president', availableIn2028Only: true },
        { name: 'Governor', path: '/states/governor' },
        { name: 'Lt. Governor', path: '/states/lt-governor' },
        { name: 'Senate', path: '/states/us-senate' },
        { name: 'House', path: '/states/us-house' }
      ];

      let linksHtml = '<ul>';
      positions.forEach(pos => {
        if (pos.availableIn2028Only && year !== 2028) {
          linksHtml += `<li>${pos.name} (No election in ${year})</li>`;
        } else {
          const url = `https://www.isidewith.com/elections/${year}${pos.path}`;
          linksHtml += `<li><a href="${url}" target="_blank" rel="noopener noreferrer">${pos.name}</a></li>`;
        }
      });
      linksHtml += '</ul>';

      card.innerHTML = `
        <div class="poll-logo"><img src="assets/elections.jpeg" alt="${year} Voter Guide"></div>
        <h3>${year} Voter Guide</h3>
        ${linksHtml}
      `;
      return card;
    };

    electionsContainer.appendChild(createVoterGuideCard(2026));
    electionsContainer.appendChild(createVoterGuideCard(2027));
    electionsContainer.appendChild(createVoterGuideCard(2028));
  }
}

// Voting tab
function showVoting() {
  showTab('voting');
  const votingCards = document.getElementById('voting-cards');
  if (!votingCards) {
    console.error("voting-cards container not found");
    return;
  }
  votingCards.innerHTML = '';
  console.log("showVoting() triggered");

  fetch('voting-data.json')
    .then(res => {
      if (!res.ok) throw new Error('Voting data file not found');
      return res.json();
    })
    .then(data => {
      let stateName = window.selectedState || 'North Carolina';
      if (stateName === 'Virgin Islands') stateName = 'U.S. Virgin Islands';
      const stateData = data[stateName] || null;

      if (!stateData || typeof stateData !== 'object') {
        votingCards.innerHTML = `<p>No voting information available for ${stateName}.</p>`;
        return;
      }

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
// === Citizenship & Immigration data (corrected links + expanded multilingual) ===
const citizenshipSections = [
  {
    label: "Naturalization process",
    targetId: "citizenship-cards",
    items: [
      {
        title: "Eligibility and application (Form N-400)",
        desc: "Who qualifies, required documents, fees, timelines, and the application process.",
        urlEn: "https://www.uscis.gov/n-400",
        urlEs: "https://www.uscis.gov/es/n-400",
        langLinks: [
          { label: "USCIS Multilingual Resource Center (all languages)", url: "https://www.uscis.gov/tools/multilingual-resource-center" }
        ]
      },
      {
        title: "The naturalization interview and test",
        desc: "What to expect in the interview, English and civics components, and how the test works.",
        urlEn: "https://www.uscis.gov/citizenship/learn-about-citizenship/the-naturalization-interview-and-test",
        urlEs: "https://www.uscis.gov/es/citizenship/learn-about-citizenship/the-naturalization-interview-and-test",
        langLinks: [
          { label: "Study for the test (multilingual hub)", url: "https://www.uscis.gov/citizenship/find-study-materials-and-resources/study-for-the-test" },
          { label: "Citizenship multilingual resources (languages list)", url: "https://www.uscis.gov/citizenship/find-study-materials-and-resources/citizenship-multilingual-resources" },
          { label: "USCIS Multilingual Resource Center (all languages)", url: "https://www.uscis.gov/tools/multilingual-resource-center" }
        ]
      }
    ]
  },
  {
    label: "Immigration pathways",
    targetId: "immigration-cards",
    items: [
      {
        title: "Family-based visas",
        desc: "Immediate relatives, family preference categories, petitions, and visa bulletin basics.",
        urlEn: "https://www.uscis.gov/family",
        urlEs: "https://www.uscis.gov/es/family",
        langLinks: [
          { label: "USCIS Multilingual Resource Center (all languages)", url: "https://www.uscis.gov/tools/multilingual-resource-center" }
        ]
      },
      {
        title: "Employment-based visas",
        desc: "Work categories, labor certification, petitions, and typical processing steps.",
        urlEn: "https://www.uscis.gov/working-in-the-united-states",
        urlEs: "https://www.uscis.gov/es/working-in-the-united-states",
        langLinks: [
          { label: "USCIS Multilingual Resource Center (all languages)", url: "https://www.uscis.gov/tools/multilingual-resource-center" }
        ]
      },
      {
        title: "Diversity Visa Lottery (State Dept.)",
        desc: "Lottery overview, eligibility, application timing, and common pitfalls.",
        urlEn: "https://travel.state.gov/content/travel/en/us-visas/immigrate/diversity-visa-program-entry.html",
        langLinks: []
      }
    ]
  },
  {
    label: "Asylum & refugees",
    targetId: "asylum-cards",
    items: [
      {
        title: "Refugees & asylum (overview)",
        desc: "Eligibility, filing, interviews, and key timelines for asylum and refugee programs.",
        urlEn: "https://www.uscis.gov/humanitarian/refugees-asylum",
        urlEs: "https://www.uscis.gov/es/humanitario/refugiados-y-asilo",
        langLinks: [
          { label: "USCIS Multilingual Resource Center (all languages)", url: "https://www.uscis.gov/tools/multilingual-resource-center" }
        ]
      },
      {
        title: "Refugee resettlement (ORR)",
        desc: "U.S. Refugee Admissions Program overview and resettlement supports.",
        urlEn: "https://www.acf.hhs.gov/orr",
        langLinks: []
      },
      {
        title: "Employment rights for refugees and asylees (DOJ)",
        desc: "Right to work protections and help for discrimination or verification issues.",
        urlEn: "https://www.justice.gov/crt/page/file/917466/dl",
        langLinks: []
      }
    ]
  },
  {
    label: "Study materials",
    targetId: "study-cards",
    items: [
      {
        title: "Study for the naturalization test",
        desc: "Official USCIS English and civics materials with multilingual options.",
        urlEn: "https://www.uscis.gov/citizenship/find-study-materials-and-resources/study-for-the-test",
        langLinks: [
          { label: "Citizenship multilingual resources (languages list)", url: "https://www.uscis.gov/citizenship/find-study-materials-and-resources/citizenship-multilingual-resources" },
          { label: "USCIS Multilingual Resource Center (all languages)", url: "https://www.uscis.gov/tools/multilingual-resource-center" }
        ]
      },
      {
        title: "Practice the civics test (hybrid mode)",
        desc: "Use our hybrid quiz with multi-select and open-response answers.",
        urlEn: "#",
        langLinks: []
      }
    ]
  },
  {
    label: "Legal resources",
    targetId: "legal-cards",
    items: [
      {
        title: "USCIS official site",
        desc: "Primary federal source for forms, policies, news, and guidance.",
        urlEn: "https://www.uscis.gov",
        urlEs: "https://www.uscis.gov/es",
        langLinks: [
          { label: "USCIS Multilingual Resource Center (all languages)", url: "https://www.uscis.gov/tools/multilingual-resource-center" }
        ]
      },
      {
        title: "Department of Homeland Security (DHS)",
        desc: "Agency updates, policy info, and language access resources.",
        urlEn: "https://www.dhs.gov",
        langLinks: [
          { label: "DHS language access resources (multilingual)", url: "https://www.dhs.gov/publications-library/collections/multilingual-and-language-access-resources" }
        ]
      },
      {
        title: "Find local assistance",
        desc: "Locate USCIS offices and community organizations offering immigration help.",
        urlEn: "https://www.uscis.gov/about-us/find-a-uscis-office",
        langLinks: []
      }
    ]
  },
  {
    label: "News & policy updates",
    targetId: "news-cards",
    items: [
      {
        title: "USCIS newsroom",
        desc: "Policy changes, press releases, and official announcements.",
        urlEn: "https://www.uscis.gov/newsroom",
        langLinks: []
      },
      {
        title: "Federal Register (immigration rules & notices)",
        desc: "Proposed rules, notices, and updates affecting immigration processes.",
        urlEn: "https://www.federalregister.gov/",
        langLinks: []
      }
    ]
  },
  {
    label: "Rights & responsibilities",
    targetId: "rights-cards",
    items: [
      {
        title: "New U.S. citizens: rights and responsibilities",
        desc: "What changes after naturalization and how to exercise your civic rights and duties.",
        urlEn: "https://www.uscis.gov/citizenship-resource-center/new-us-citizens",
        langLinks: [
          { label: "USCIS Multilingual Resource Center (all languages)", url: "https://www.uscis.gov/tools/multilingual-resource-center" }
        ]
      },
      {
        title: "Know your rights (immigrants, asylum seekers, refugees)",
        desc: "Civil rights, anti-discrimination protections, and employment rights with multilingual materials.",
        urlEn: "https://www.justice.gov/crt",
        langLinks: [
          { label: "DHS language access resources (multilingual)", url: "https://www.dhs.gov/publications-library/collections/multilingual-and-language-access-resources" },
          { label: "Community multilingual Know Your Rights materials", url: "https://www.miracoalition.org/know-your-rights-print-materials-in-multiple-language/" },
          { label: "Multilingual Know Your Rights cards", url: "https://www.nilc.org/resources/know-your-rights-card/" }
        ]
      }
    ]
  }
];

// === Helper: render multilingual link row (expanded) ===
function renderLangRow(item) {
  const links = [];

  if (item.urlEn) {
    links.push(`<span class="lang-link"><a href="${item.urlEn}" target="_blank" rel="noopener noreferrer">English</a></span>`);
  }
  if (item.urlEs) {
    links.push(`<span class="lang-link"><a href="${item.urlEs}" target="_blank" rel="noopener noreferrer">Español</a></span>`);
  }
  if (item.urlZh) {
    links.push(`<span class="lang-link"><a href="${item.urlZh}" target="_blank" rel="noopener noreferrer">中文</a></span>`);
  }
  if (item.urlAr) {
    links.push(`<span class="lang-link"><a href="${item.urlAr}" target="_blank" rel="noopener noreferrer">العربية</a></span>`);
  }

  if (Array.isArray(item.langLinks)) {
    item.langLinks.forEach(l => {
      if (l && l.url && l.label) {
        links.push(`<span class="lang-link"><a href="${l.url}" target="_blank" rel="noopener noreferrer">${l.label}</a></span>`);
      }
    });
  }

  return links.length ? `<div class="lang-row">${links.join(' • ')}</div>` : '';
}

// === Citizenship/Immigration tab renderer ===
function showCitizenship() {
  showTab('citizenship');

  citizenshipSections.forEach(section => {
    const container = document.getElementById(section.targetId);
    if (!container) return;

    container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'resource-section';

    const header = document.createElement('h3');
    header.textContent = section.label;
    wrapper.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'resource-grid';

    section.items.forEach(item => {
      let card;

      // Special handling for civics test launchers
      if (item.title.includes("Practice the civics test")) {
        card = document.createElement('div');
        card.className = 'resource-card';
        card.innerHTML = `
          <h4>Practice the Naturalization Civics Test (2008 version)</h4>
          <p class="card-desc">Official 2008 test — 100 questions, 10 asked, 6 correct to pass.</p>
          <button class="card-button" onclick="openPractice2008Modal()">Launch 2008 Test</button>
          <h4>Practice the Naturalization Civics Test (2025 version)</h4>
          <p class="card-desc">New 2025 test — based on 2020 version, 128 questions.</p>
          <button class="card-button" onclick="openPractice2025Modal()">Launch 2025 Test</button>
        `;
      } else {
        card = document.createElement('a');
        card.className = 'resource-card';

        const url = item.urlEn || item.urlEs || item.urlZh || item.urlAr || item.url;
        card.href = url || '#';
        card.target = '_blank';
        card.rel = 'noopener noreferrer';

        card.innerHTML = `
          <h4>${item.title}</h4>
          <p class="card-desc">${item.desc}</p>
          ${renderLangRow(item)}
        `;
      }

      grid.appendChild(card);
    });

    wrapper.appendChild(grid);
    container.appendChild(wrapper);
  });
}

// === Civics Quiz Logic (Daily + Practice Tests) ===
let civicsQuestions = [];
let currentQuestionIndex = 0;
let civicsScore = 0;

// === Daily Civics Quiz Launcher (uses name="opt") ===
function openDailyQuizModal() {
  const modal = document.getElementById('civicsQuizModal');
  if (!modal) return;
  modal.style.display = 'block';

  currentQuestionIndex = 0;
  civicsScore = 0;
  document.getElementById('quiz-progress-fill').style.width = '0%';
  document.getElementById('quiz-progress').textContent = '';
  document.getElementById('quiz-feedback').textContent = '';
  document.getElementById('quiz-score').textContent = '';

  document.getElementById('quiz-title').textContent = "Daily Civics Quiz";
  document.getElementById('quiz-desc').textContent =
    "Test your United States government, economics, and history knowledge.";

  // Load Daily quiz dataset and render using Daily engine
  fetch('civics-questions.json')
    .then(res => res.json())
    .then(data => {
      // Daily engine variables
      window.quizQuestions = data;       // keep Daily’s variables
      window.currentQuestion = 0;
      window.score = 0;

      renderQuestion(); // Daily renderer already in your file

      // Wire Daily handlers to this modal instance
      const submitBtn = document.getElementById('quiz-submit');
      const nextBtn = document.getElementById('quiz-next');

      // Daily submit: reads inputs with name="opt"
     submitBtn.onclick = () => {
  const selected = document.querySelector('input[name="opt"]:checked');
  if (!selected) {
    alert("Pick an answer!");
    return;
  }
  const q = quizQuestions[currentQuestion];
  const selectedIndex = parseInt(selected.value, 10);
  const correctText = q.answers[0]; // use the first string in answers[]
  const feedbackEl = document.getElementById("quiz-feedback");

  if (q.choices[selectedIndex] === correctText) {
    score++;
    feedbackEl.className = "correct";
    feedbackEl.innerHTML = `✅ Correct — ${correctText}<br><small>${q.explanation}</small>`;
  } else {
    feedbackEl.className = "incorrect";
    feedbackEl.innerHTML = `❌ Incorrect. Correct answer: ${correctText}<br><small>${q.explanation}</small>`;
  }

  submitBtn.style.display = "none";
  nextBtn.style.display = "inline-block";
};

      nextBtn.onclick = () => {
        currentQuestion++;
        if (currentQuestion < quizQuestions.length) {
          renderQuestion();
          document.getElementById("quiz-feedback").textContent = "";
          document.getElementById("quiz-submit").style.display = "inline-block";
          document.getElementById("quiz-next").style.display = "none";
        } else {
          document.getElementById("quiz-question").innerHTML = "";
          document.getElementById("quiz-options").innerHTML = "";
          document.getElementById("quiz-progress").textContent = "";
          document.getElementById("quiz-progress-fill").style.width = "100%";
          document.getElementById("quiz-feedback").textContent = "";
          document.getElementById("quiz-score").textContent =
            `Final Score: ${score}/${quizQuestions.length} — ${score >= 12 ? "Pass ✅" : "Try Again ❌"}`;
          document.getElementById("quiz-next").style.display = "none";
        }
      };
    })
    .catch(err => {
      console.error("Error loading daily quiz:", err);
      document.getElementById('quiz-question').textContent = "Error loading quiz questions.";
    });
}

// === USCIS 2008 Practice Test (uses name="civics-choice") ===
function openPractice2008Modal() {
  const modal = document.getElementById('civicsQuizModal');
  if (!modal) return;
  modal.style.display = 'block';

  currentQuestionIndex = 0;
  civicsScore = 0;
  document.getElementById('quiz-progress-fill').style.width = '0%';
  document.getElementById('quiz-progress').textContent = '';
  document.getElementById('quiz-feedback').textContent = '';
  document.getElementById('quiz-score').textContent = '';

  document.getElementById('quiz-title').textContent = "Practice Test (2008)";
  document.getElementById('quiz-desc').textContent =
    "Official 2008 Naturalization Civics Practice Test — 100 questions.";

  fetch("uscistest2008.json")
    .then(res => res.json())
    .then(data => {
      civicsQuestions = data;
      renderCivicsQuestion();

      // Wire practice submit to checkCivicsAnswer
      const submitBtn = document.getElementById('quiz-submit');
      const nextBtn = document.getElementById('quiz-next');
      submitBtn.onclick = () => checkCivicsAnswer();
      // next button is set inside checkCivicsAnswer
    })
    .catch(err => {
      console.error("Error loading 2008 test:", err);
      document.getElementById('quiz-question').textContent = "Error loading test questions.";
    });
}

// === USCIS 2025 Practice Test (uses name="civics-choice") ===
function openPractice2025Modal() {
  const modal = document.getElementById('civicsQuizModal');
  if (!modal) return;
  modal.style.display = 'block';

  currentQuestionIndex = 0;
  civicsScore = 0;
  document.getElementById('quiz-progress-fill').style.width = '0%';
  document.getElementById('quiz-progress').textContent = '';
  document.getElementById('quiz-feedback').textContent = '';
  document.getElementById('quiz-score').textContent = '';

  document.getElementById('quiz-title').textContent = "Practice Test (2025)";
  document.getElementById('quiz-desc').textContent =
    "New 2025 Naturalization Civics Practice Test — 128 questions.";

  fetch("uscistest2025.json")
    .then(res => res.json())
    .then(data => {
      civicsQuestions = data;
      renderCivicsQuestion();

      // Wire practice submit to checkCivicsAnswer
      const submitBtn = document.getElementById('quiz-submit');
      const nextBtn = document.getElementById('quiz-next');
      submitBtn.onclick = () => checkCivicsAnswer();
      // next button is set inside checkCivicsAnswer
    })
    .catch(err => {
      console.error("Error loading 2025 test:", err);
      document.getElementById('quiz-question').textContent = "Error loading test questions.";
    });
}

// === Render a civics question ===
function renderCivicsQuestion() {
  if (!Array.isArray(civicsQuestions) || civicsQuestions.length === 0) return;

  const q = civicsQuestions[currentQuestionIndex];
  const questionEl = document.getElementById('quiz-question');
  const optionsDiv = document.getElementById('quiz-options');
  const feedback = document.getElementById('quiz-feedback');
  const nextBtn = document.getElementById('quiz-next');

  questionEl.textContent = q.question;
  optionsDiv.innerHTML = '';
  feedback.textContent = '';
  nextBtn.style.display = 'none';

  let choices = Array.isArray(q.choices) && q.choices.length
    ? [...q.choices]
    : [...q.answers];

  choices = shuffleArray(choices);

  const isMulti = q.type === "multi-select";
  choices.forEach((opt, idx) => {
    const id = `opt-${currentQuestionIndex}-${idx}`;
    const wrapper = document.createElement('div');
    wrapper.className = 'quiz-choice';

    const input = document.createElement('input');
    input.type = isMulti ? 'checkbox' : 'radio';
    input.name = 'civics-choice';
    input.id = id;
    input.value = opt;

    const label = document.createElement('label');
    label.setAttribute('for', id);
    label.textContent = opt;

    wrapper.appendChild(input);
    wrapper.appendChild(label);
    optionsDiv.appendChild(wrapper);
  });

  // Progress bar
  const progress = ((currentQuestionIndex + 1) / civicsQuestions.length) * 100;
  document.getElementById('quiz-progress-fill').style.width = `${progress}%`;
  document.getElementById('quiz-progress').textContent =
    `Question ${currentQuestionIndex + 1} of ${civicsQuestions.length}`;
}

// === Evaluate selection ===
// === Evaluate selection with explanations and multi-select support ===
function checkCivicsAnswer() {
  const q = civicsQuestions[currentQuestionIndex];
  const feedback = document.getElementById('quiz-feedback');
  const nextBtn = document.getElementById('quiz-next');

  // Scope to civics modal options
  const optionsRoot = document.querySelector('#civicsQuizModal #quiz-options');
  const selected = Array.from(optionsRoot.querySelectorAll('input[name="civics-choice"]'))
    .filter(el => el.checked)
    .map(el => el.value);

  if (selected.length === 0) {
    feedback.textContent = "Please select at least one option.";
    feedback.style.color = "orange";
    return;
  }

  let isCorrect = false;
  if (q.type === "open-response") {
    isCorrect = (selected.length === 1) && (selected[0] === q.answers[0]);
  } else {
    const selectedSet = new Set(selected);
    const correctSet = new Set(q.answers);
    isCorrect = [...correctSet].every(v => selectedSet.has(v)) && selectedSet.size === correctSet.size;
  }

  if (isCorrect) {
    civicsScore++;
    feedback.style.color = "limegreen";
    feedback.textContent = "Correct!";
  } else {
    feedback.style.color = "red";
    const incorrectSelections = selected.filter(s => !q.answers.includes(s));
    const missingSelections = q.answers.filter(a => !selected.includes(a));

    let detail = `Incorrect. Correct answers: ${q.answers.join(", ")}.`;
    if (incorrectSelections.length) {
      detail += ` You chose incorrectly: ${incorrectSelections.join(", ")}.`;
    }
    if (missingSelections.length) {
      detail += ` You missed: ${missingSelections.join(", ")}.`;
    }
    feedback.textContent = detail;
  }

  // Explanation support
  if (q.explanation) {
    feedback.textContent += ` ${q.explanation}`;
  }

  nextBtn.style.display = 'inline-block';
  nextBtn.onclick = () => {
    currentQuestionIndex++;
    if (currentQuestionIndex < civicsQuestions.length) {
      renderCivicsQuestion();
      feedback.textContent = '';
      nextBtn.style.display = 'none';
    } else {
      document.getElementById('quiz-question').textContent = "Test complete!";
      document.getElementById('quiz-options').innerHTML = '';
      document.getElementById('quiz-score').textContent =
        `You scored ${civicsScore} out of ${civicsQuestions.length}`;
      nextBtn.style.display = 'none';
    }
  };
}

// === Utility: shuffle ===
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Submit is wired inside each launcher (Daily or Practice) — no global wiring here.

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

fetch('cabinet.json')
  .then(res => res.json())
  .then(data => renderCabinetGrid(data));

// === DETAIL: show a single Cabinet member in the modal ===
function showCabinetMemberDetail(member) {
  const detail = document.getElementById('cabinetMemberDetail');
  detail.innerHTML = `
    <div class="detail-layout">
      <div class="detail-left">
        <img src="${member.photo || 'assets/default-photo.png'}" 
             alt="${member.name || ''}" 
             class="portrait"
             onerror="this.onerror=null;this.src='assets/default-photo.png';" />
        ${member.seal ? `<img src="${member.seal}" alt="${member.office} seal" class="seal" />` : ''}
      </div>
      <div class="detail-right">
        <h2>${member.name || 'Unknown'}</h2>
        <p><strong>Office:</strong> ${member.office || ''}</p>
        <p><strong>State:</strong> ${member.state || ''}</p>
        <p><strong>Party:</strong> ${member.party || ''}</p>
        <p><strong>Term:</strong> ${member.term || ''}</p>
        <p><strong>Bio:</strong> ${member.bio || ''}</p>
        <p><strong>Education:</strong> ${member.education || ''}</p>
        <p><strong>Salary:</strong> ${member.salary || ''}</p>
        <p><strong>Predecessor:</strong> ${member.predecessor || ''}</p>
        ${member.links?.map(link =>
          `<p><a href="${link.url}" target="_blank">${link.label}</a></p>`
        ).join('') || ''}
      </div>
    </div>
  `;

  document.getElementById('cabinetGridView').style.display = 'none';
  document.getElementById('cabinetDetailView').style.display = 'block';
}

// === QUIZZES TAB ===
function showQuizzes() {
  showTab('quizzes'); // switch to the quizzes tab

  const quizLaunchers = document.getElementById('quiz-launchers');
  if (!quizLaunchers) {
    console.error("Quiz launchers container not found.");
    return;
  }

  // You already hard-coded the quiz cards in HTML,
  // so here we just make sure the tab shows them.
  quizLaunchers.style.display = 'flex';
}

// === CIVIC TAB ===
function showCivic() {
  showTab('civic');

  const calendar = document.getElementById('calendar');
  if (!calendar) {
    console.error("Calendar element not found in Civic tab.");
    return;
  }
  calendar.innerHTML = '';

  const section = document.createElement('div');
  section.className = 'civic-section';

  // --- State block ---
  const stateBlock = document.createElement('div');
  stateBlock.className = 'civic-block';
  stateBlock.innerHTML = '<h2>State Legislative Links</h2>';

  fetch('state-links.json')
    .then(res => {
      if (!res.ok) throw new Error('Failed to load state-links.json');
      return res.json();
    })
    .then(stateLinks => {
      const normalizedState = selectedState === 'Virgin Islands' ? 'U.S. Virgin Islands' : selectedState;
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
  {label: 'NGA Members', url: 'https://www.nga.org/governors/',desc: 'Explore the full roster of U.S. governors through the National Governors Association.'},
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

      // --- NLGA block ---
      const nlgaBlock = document.createElement('div');
      nlgaBlock.className = 'civic-block';
      nlgaBlock.innerHTML = '<h2>National Lt. Governor\'s Association</h2>';

      const nlgaLinks = [
        { label: 'NLGA Members', url: 'https://nlga.us/our-members/', desc: 'Browse the full roster of NLGA members across states and territories.' },
        { label: 'NLGA Officers & Executive Committee', url: 'https://nlga.us/about-nlga/officers-exec-committee-operational-committees/', desc: 'Meet the officers and Executive Committee guiding NLGA’s priorities and governance.' },
        { label: 'Meetings', url: 'https://nlga.us/nlga-meetings/', desc: 'Learn about NLGA’s annual, spring, and winter meetings where members convene.' },
        { label: 'State Strategies Committee on Aerospace', url: 'https://nlga.us/strategies/nlga-aerospace-committee/', desc: 'Explore NLGA’s bipartisan Aerospace Committee advancing state strategies in aviation and defense.' },
        { label: 'Current NLGA Resolutions', url: 'https://nlga.us/strategies/nlga-consensus-resolutions/', desc: 'Review NLGA’s consensus resolutions reflecting bipartisan agreement on key policy issues.' },
        { label: 'State Strategies in STEM', url: 'https://nlga.us/state-strategies-in-stem/', desc: 'See how NLGA promotes STEM education and scholarships to strengthen workforce development.' },
        { label: 'Methods of Election', url: 'https://nlga.us/research/methods-of-election/', desc: 'Understand the different methods states use to elect lieutenant governors.' }
      ];

      const nlgaGrid = document.createElement('div');
      nlgaGrid.className = 'link-grid';

      nlgaLinks.forEach(link => {
        const card = document.createElement('div');
        card.className = 'link-card';
        card.setAttribute('onclick', `window.open('${link.url}', '_blank')`);
        card.innerHTML = `
          <h4>${link.label}</h4>
          <p class="card-desc">${link.desc}</p>
        `;
        nlgaGrid.appendChild(card);
      });

      nlgaBlock.appendChild(nlgaGrid);

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

          // Append all blocks to the section in correct order
      section.appendChild(stateBlock);
      section.appendChild(ngaBlock);
      section.appendChild(nlgaBlock);   // <-- add NLGA here
      section.appendChild(federalBlock);

      // Render into the calendar container
      calendar.appendChild(section);
    })
    .catch(err => {
      calendar.innerHTML = '<p>Error loading civic links.</p>';
      console.error(err);
    });

}// === CABINET MODAL LOGIC ===
function showCabinet() {
  const list = document.getElementById('cabinetList');
  const gridView = document.getElementById('cabinetGridView');
  const detailView = document.getElementById('cabinetDetailView');
  const modal = document.getElementById('cabinetModal');

  if (!list || !gridView || !detailView || !modal) {
    console.error('Cabinet modal elements missing.');
    return;
  }

  gridView.style.display = 'block';
  detailView.style.display = 'none';
  list.innerHTML = '';

  fetch('cabinet.json')
    .then(res => res.json())
    .then(members => {
      if (!Array.isArray(members)) {
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

        card.onclick = () => showCabinetMember(member);
        list.appendChild(card);
      });

      modal.style.display = 'block';
    })
    .catch(err => {
      list.innerHTML = '<p>Error loading Cabinet data.</p>';
      modal.style.display = 'block';
    });
}

function showCabinetMember(member) {
  const gridView = document.getElementById('cabinetGridView');
  const detailView = document.getElementById('cabinetDetailView');
  const detail = document.getElementById('cabinetMemberDetail');

  if (!gridView || !detailView || !detail) return;

  // Hide grid, show detail
  gridView.style.display = 'none';
  detailView.style.display = 'block';

  // Safe fallbacks for portrait and seal
  const photoSrc = member.photo && member.photo.trim() !== ''
    ? member.photo
    : 'assets/default-photo.png';

  const sealSrc = member.seal && member.seal.trim() !== ''
    ? member.seal
    : 'assets/default-seal.png';

  // Handle term dates
  const parseYear = d => {
    if (!d || d.trim() === '') return '';
    const dt = new Date(d);
    return isNaN(dt) ? '' : dt.getFullYear();
  };
  const termStartYear = parseYear(member.termStart);
  const termEndYear = parseYear(member.termEnd) || 'Present';

  // Build detail HTML
  detail.innerHTML = `
    <div class="detail-header">
      <img src="${photoSrc}" alt="${member.name || ''}" class="portrait"
           onerror="this.onerror=null;this.src='assets/default-photo.png';" />
      <img src="${sealSrc}" alt="${member.office || 'Seal'}" class="seal"
           onerror="this.onerror=null;this.src='assets/default-seal.png';" />
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
// === CIVICS QUIZ MODAL OPEN ===
function openCivicsQuizModal() {
  const modal = document.getElementById('civicsQuizModal');
  if (!modal) {
    console.error("Civics quiz modal not found.");
    return;
  }
  modal.style.display = 'block';
  initCivicsQuiz(); // kick off the quiz engine
}

// === Daily Civics Quiz Engine ===
let quizQuestions = [];
let allQuestions = [];
let currentQuestion = 0;
let score = 0;

// Randomizer tracking
let civicsPool = [];
let civicsIndex = 0;

function initCivicsQuiz() {
  currentQuestion = 0;
  score = 0;

  // Clear previous results
  const scoreBox = document.getElementById("quiz-score");
  if (scoreBox) scoreBox.textContent = "";
  const feedbackEl = document.getElementById("quiz-feedback");
  if (feedbackEl) {
    feedbackEl.textContent = "";
    feedbackEl.className = "";
  }

  fetch('civics-questions.json')
    .then(res => res.json())
    .then(data => {
      allQuestions = data;
      quizQuestions = getDailyQuestions();

      renderQuestion();

      // 🔑 Wire handlers AFTER rendering
      const submitBtn = document.getElementById("quiz-submit");
      const nextBtn = document.getElementById("quiz-next");

      submitBtn.onclick = () => {
        const selected = document.querySelector('input[name="opt"]:checked');
        if (!selected) {
          alert("Pick an answer!");
          return;
        }
        const q = quizQuestions[currentQuestion];
        const selectedIndex = parseInt(selected.value, 10);
        const correctText = q.answers[0];
        const feedbackEl = document.getElementById("quiz-feedback");

        if (q.choices[selectedIndex] === correctText) {
          score++;
          feedbackEl.className = "correct";
          feedbackEl.innerHTML = `✅ Correct — ${correctText}<br><small>${q.explanation}</small>`;
        } else {
          feedbackEl.className = "incorrect";
          feedbackEl.innerHTML = `❌ Incorrect. Correct answer: ${correctText}<br><small>${q.explanation}</small>`;
        }

        submitBtn.style.display = "none";
        nextBtn.style.display = "inline-block";
      };

      nextBtn.onclick = () => {
        currentQuestion++;
        if (currentQuestion < quizQuestions.length) {
          renderQuestion();
          document.getElementById("quiz-feedback").textContent = "";
          submitBtn.style.display = "inline-block";
          nextBtn.style.display = "none";
        } else {
          document.getElementById("quiz-question").innerHTML = "";
          document.getElementById("quiz-options").innerHTML = "";
          document.getElementById("quiz-progress").textContent = "";
          document.getElementById("quiz-progress-fill").style.width = "100%";
          document.getElementById("quiz-feedback").textContent = "";
          document.getElementById("quiz-score").textContent =
            `Final Score: ${score}/${quizQuestions.length} — ${score >= 12 ? "Pass ✅" : "Try Again ❌"}`;
          nextBtn.style.display = "none";
        }
      };
    })
    .catch(err => {
      console.error("Error loading civics-questions.json:", err);
      document.getElementById("quiz-question").textContent = "Failed to load questions.";
    });
}

function getDailyQuestions() {
  const today = new Date().toDateString();
  const saved = localStorage.getItem("civicsQuizDate");

  if (saved === today) {
    return JSON.parse(localStorage.getItem("civicsQuizQuestions"));
  } else {
    // If pool is empty or exhausted, reshuffle the full set
    if (civicsPool.length === 0 || civicsIndex + 20 > civicsPool.length) {
      civicsPool = allQuestions.slice().sort(() => 0.5 - Math.random());
      civicsIndex = 0;
    }

    // Take the next 20 questions sequentially from the shuffled pool
    const newSet = civicsPool.slice(civicsIndex, civicsIndex + 20);
    civicsIndex += 20;

    // Save today's set so it stays consistent if user refreshes
    localStorage.setItem("civicsQuizDate", today);
    localStorage.setItem("civicsQuizQuestions", JSON.stringify(newSet));

    return newSet;
  }
}

function renderQuestion() {
  const q = quizQuestions[currentQuestion];

  document.getElementById("quiz-progress").textContent =
    `Question ${currentQuestion + 1} of ${quizQuestions.length}`;
  document.getElementById("quiz-progress-fill").style.width =
    `${((currentQuestion + 1) / quizQuestions.length) * 100}%`;

  document.getElementById("quiz-question").innerHTML = `<h3>${q.question}</h3>`;

  document.getElementById("quiz-options").innerHTML = q.choices.map((choice,i) =>
    `<label><input type="radio" name="opt" value="${i}"> ${choice}</label><br>`
  ).join("");

  document.getElementById("quiz-feedback").textContent = "";
  document.getElementById("quiz-submit").style.display = "inline-block";
  document.getElementById("quiz-next").style.display = "none";
}

document.getElementById("quiz-submit").onclick = () => {
  const selected = document.querySelector('input[name="opt"]:checked');
  if (!selected) {
    alert("Pick an answer!");
    return;
  }
  const q = quizQuestions[currentQuestion];
  const selectedIndex = parseInt(selected.value, 10);
  const correctText = q.answers[0]; // use first string in answers[]
  const feedbackEl = document.getElementById("quiz-feedback");

  if (q.choices[selectedIndex] === correctText) {
    score++;
    feedbackEl.className = "correct";
    feedbackEl.innerHTML = `✅ Correct — ${correctText}<br><small>${q.explanation}</small>`;
  } else {
    feedbackEl.className = "incorrect";
    feedbackEl.innerHTML = `❌ Incorrect. Correct answer: ${correctText}<br><small>${q.explanation}</small>`;
  }

  document.getElementById("quiz-submit").style.display = "none";
  document.getElementById("quiz-next").style.display = "inline-block";
};

document.getElementById("quiz-next").onclick = () => {
  currentQuestion++;
  if (currentQuestion < quizQuestions.length) {
    renderQuestion();
  } else {
    document.getElementById("quiz-question").innerHTML = "";
    document.getElementById("quiz-options").innerHTML = "";
    document.getElementById("quiz-progress").textContent = "";
    document.getElementById("quiz-progress-fill").style.width = "100%";
    document.getElementById("quiz-feedback").textContent = "";
    document.getElementById("quiz-score").textContent =
      `Final Score: ${score}/${quizQuestions.length} — ${score >= 12 ? "Pass ✅" : "Try Again ❌"}`;
    document.getElementById("quiz-next").style.display = "none";
  }
};

// === Political Typology Quiz Logic (schema uses "q") ===

function openTypologyQuizModal() {
  const modal = document.getElementById('typologyQuizModal');
  if (!modal) {
    console.error("Typology quiz modal not found.");
    return;
  }
  modal.style.display = 'block';

  // Delay init slightly so DOM is ready
  setTimeout(() => {
    initTypologyQuiz();
  }, 50);
}

let typologyQuestions = [];
let currentTypologyQuestion = 0;
let scoreMap = {};

// === Init (flat array loader) ===
function initTypologyQuiz() {
  currentTypologyQuestion = 0;
  scoreMap = {
    progressive: 0,
    liberal: 0,
    conservative: 0,
    libertarian: 0,
    socialist: 0,
    populist: 0,
    centrist: 0
  };

  const resultBox = document.getElementById("typology-result");
  if (resultBox) {
    resultBox.style.display = "none";
    resultBox.innerHTML = "";
  }

  fetch('typology-questions.json')
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then(data => {
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error("No questions found in typology-questions.json (expected flat array)");
      }

      typologyQuestions = data.slice(); // copy
      console.log("Loaded typology questions:", typologyQuestions);

      renderTypologyQuestion();
    })
    .catch(err => {
      console.error("Error loading typology-questions.json:", err);
      const questionEl = document.getElementById("typology-question");
      if (questionEl) {
        questionEl.textContent = "Failed to load questions.";
      }
    });
}

// === Renderer (displays current question) ===
function renderTypologyQuestion() {
  if (!typologyQuestions || typologyQuestions.length === 0) {
    const qEl = document.getElementById("typology-question");
    if (qEl) qEl.textContent = "No questions loaded.";
    return;
  }

  if (currentTypologyQuestion >= typologyQuestions.length) {
    showTypologyResult();
    return;
  }

  const q = typologyQuestions[currentTypologyQuestion];

  // Progress text + bar
  const progressText = document.getElementById("typology-progress");
  if (progressText) {
    progressText.textContent =
      `Question ${currentTypologyQuestion + 1} of ${typologyQuestions.length}`;
  }

  const progressFill = document.getElementById("typology-progress-fill");
  if (progressFill) {
    progressFill.style.width =
      `${((currentTypologyQuestion + 1) / typologyQuestions.length) * 100}%`;
  }

  // Question text
  const questionEl = document.getElementById("typology-question");
  if (questionEl) {
    questionEl.innerHTML = `<h3>${q.q}</h3>`;
  }

  // Options
  const optionsEl = document.getElementById("typology-options");
  if (optionsEl) {
    optionsEl.innerHTML = q.options.map((opt, i) =>
      `<label><input type="radio" name="typologyOpt" value="${i}"> ${opt}</label><br>`
    ).join("");
  }

  // Reset feedback/controls
  const feedbackEl = document.getElementById("typology-feedback");
  if (feedbackEl) feedbackEl.textContent = "";

  const submitBtn = document.getElementById("typology-submit");
  if (submitBtn) submitBtn.style.display = "inline-block";

  const nextBtn = document.getElementById("typology-next");
  if (nextBtn) nextBtn.style.display = "none";
}

// === Submit handler ===
(function attachTypologySubmit() {
  const submitBtn = document.getElementById("typology-submit");
  if (!submitBtn) return;
  submitBtn.onclick = () => {
    const selected = document.querySelector('input[name="typologyOpt"]:checked');
    if (!selected) {
      alert("Pick an answer!");
      return;
    }

    const q = typologyQuestions[currentTypologyQuestion];
    const selectedIndex = parseInt(selected.value, 10);

    // Apply weights from schema (5-point scale)
    for (const [label, weight] of Object.entries(q.weights)) {
      if (selectedIndex === 0) scoreMap[label] += weight;           // Strongly Agree
      else if (selectedIndex === 1) scoreMap[label] += weight / 2;  // Agree
      else if (selectedIndex === 2) scoreMap[label] += 0;           // Neutral
      else if (selectedIndex === 3) scoreMap[label] -= weight / 2;  // Disagree
      else if (selectedIndex === 4) scoreMap[label] -= weight;      // Strongly Disagree
    }

    currentTypologyQuestion++;
    if (currentTypologyQuestion < typologyQuestions.length) {
      renderTypologyQuestion();
    } else {
      showTypologyResult();
    }
  };
})();

// === Results renderer ===
function showTypologyResult() {
  const topLabel = Object.keys(scoreMap).reduce((a, b) =>
    scoreMap[a] > scoreMap[b] ? a : b
  );

  const emojiMap = {
    progressive: "🔥",
    liberal: "📘",
    conservative: "🛡️",
    libertarian: "🗽",
    socialist: "✊",
    populist: "🇺🇸",
    centrist: "⚖️"
  };

  const descriptions = {
    progressive: "You believe government should actively reshape society to ensure fairness and equality.",
    liberal: "You value individual rights, pluralism, and moderate government intervention.",
    conservative: "You emphasize tradition, limited government, and free markets.",
    libertarian: "You prize freedom above all — both economic and personal.",
    socialist: "You believe collective action and redistribution are essential to justice.",
    populist: "You emphasize cultural identity, patriotism, and government protectionism.",
    centrist: "You balance positions across the spectrum, preferring compromise and pragmatism."
  };

  // Clear quiz UI
  const qEl = document.getElementById("typology-question");
  if (qEl) qEl.innerHTML = "";

  const optionsEl = document.getElementById("typology-options");
  if (optionsEl) optionsEl.innerHTML = "";

  const progressText = document.getElementById("typology-progress");
  if (progressText) progressText.textContent = "";

  const progressFill = document.getElementById("typology-progress-fill");
  if (progressFill) progressFill.style.width = "100%";

  const feedbackEl = document.getElementById("typology-feedback");
  if (feedbackEl) feedbackEl.textContent = "";

  const submitBtn = document.getElementById("typology-submit");
  if (submitBtn) submitBtn.style.display = "none";

  // Show result
  const resultBox = document.getElementById("typology-result");
  if (resultBox) {
    resultBox.style.display = "block";
    resultBox.innerHTML =
      `<div class="typology-badge badge-${topLabel}">${emojiMap[topLabel]} ${topLabel.toUpperCase()}</div>
       <h2>Your Typology: ${topLabel}</h2>
       <p>${descriptions[topLabel]}</p>
       <div class="quiz-controls">
         <button id="typology-restart" class="quiz-btn">Restart Quiz</button>
       </div>`;

    // Attach restart handler
    const restartBtn = document.getElementById("typology-restart");
    if (restartBtn) {
      restartBtn.onclick = () => {
        resultBox.style.display = "none";
        resultBox.innerHTML = "";
        initTypologyQuiz();
      };
    }
  }
}

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
  section.innerHTML = '';  // Clears old content

  // ADD THE TITLE BACK FIRST
  const title = document.createElement('h2');
  title.textContent = 'Political Groups — Help Make a Difference!';
  section.appendChild(title);

  // ADD FEATURED CARDS (Parties + Ideologies)
  const featured = document.createElement('div');
  featured.id = 'featured-political-cards';
  featured.className = 'card-section';

  // Parties card
  const partiesCard = document.createElement('div');
  partiesCard.className = 'info-card';
  partiesCard.innerHTML = `
    <img src="assets/political-parties.png" alt="Political Parties" class="card-image" />
    <h3>Political Parties</h3>
    <p>Explore the major parties shaping U.S. politics.</p>
    <a href="https://www.isidewith.com/parties" target="_blank" rel="noopener noreferrer" class="btn">View Parties</a>
  `;
  featured.appendChild(partiesCard);

  // Ideologies card
  const ideologiesCard = document.createElement('div');
  ideologiesCard.className = 'info-card';
  ideologiesCard.innerHTML = `
    <img src="assets/political-ideology.jpeg" alt="Political Ideologies" class="card-image" />
    <h3>Political Ideologies</h3>
    <p>Learn about the diverse ideologies influencing policy and debate.</p>
    <a href="https://www.isidewith.com/ideologies" target="_blank" rel="noopener noreferrer" class="btn">View Ideologies</a>
  `;
  featured.appendChild(ideologiesCard);

  section.appendChild(featured);

  // Now load the groups as before
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
      section.innerHTML += '<p>Error loading political groups.</p>';  // += so title stays
      console.error(err);
    });
}

function showStartupHub() {
  showTab('startup-hub'); // makes sure only the Home Hub tab is visible

  const hubContainer = document.getElementById('hub-cards');
  if (!hubContainer) return;
  hubContainer.innerHTML = '';

  // Removed "Popular Podcasts" and "Trending Now"
  const hubItems = [
    { title: "National Broadcasting Networks", id: "national-networks" },
    { title: "Global Politics & World News", id: "global-news" },
    { title: "Finance & Markets", id: "finance-markets" },
    { title: "Economy", id: "economy" }
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
    "photo": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS-htUM6chbfF88ldyeCNBFsHr-oOK3NgyMpg&s",
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

// === OFFICIALS MODAL (with per‑modal social links) ===
async function getSocialLinks() {
  if (window.__socialLinksCache) return window.__socialLinksCache;
  const res = await fetch('/social-links.json');
  window.__socialLinksCache = await res.json();
  return window.__socialLinksCache;
}

function injectSocialLinksIntoModal(slug) {
  getSocialLinks().then(data => {
    const links = data[slug];
    const container = document.getElementById(`social-${slug}`);
    if (!container || !links) return;

    container.innerHTML = '';

    if (links.facebook) container.innerHTML += `<a href="${links.facebook}" target="_blank" rel="noopener noreferrer"><img src="/assets/facebook.svg" alt="Facebook"></a>`;
    if (links.instagram) container.innerHTML += `<a href="${links.instagram}" target="_blank" rel="noopener noreferrer"><img src="/assets/instagram.svg" alt="Instagram"></a>`;
    if (links.x) container.innerHTML += `<a href="${links.x}" target="_blank" rel="noopener noreferrer"><img src="/assets/x.svg" alt="X"></a>`;
    if (links.youtube) container.innerHTML += `<a href="${links.youtube}" target="_blank" rel="noopener noreferrer"><img src="/assets/youtube.svg" alt="YouTube"></a>`;
    if (links.tiktok) container.innerHTML += `<a href="${links.tiktok}" target="_blank" rel="noopener noreferrer"><img src="/assets/tiktok.svg" alt="TikTok"></a>`;
  });
}

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

  // derive a slug from the official name if not provided
  const slug = (cleanOfficial.slug || (cleanOfficial.name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, ''));

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

        <!-- Social links row injected per modal -->
        <div class="ps-social-links" id="social-${slug}"></div>
      </div>
    </div>
  `;

  modal.style.display = 'block';

  // inject social links for this specific official
  injectSocialLinksIntoModal(slug);

  const clickOutsideHandler = function(event) {
    if (event.target === modal) {
      modal.style.display = 'none';
      window.removeEventListener('click', clickOutsideHandler);
    }
  };
  window.addEventListener('click', clickOutsideHandler);
}

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

// Simple startup hub loader
function showStartupHub() {
  showTab('startup-hub');
}

document.addEventListener('DOMContentLoaded', () => {
  const feedTitle = document.getElementById('feed-title');
  const feedStories = document.getElementById('feed-stories');

  // Official RSS feeds per network
  const rssFeeds = {
    msnbc: 'https://feeds.nbcnews.com/nbcnews/public/news',   // NBC/MSNBC general news
    abc:   'https://abcnews.go.com/abcnews/topstories',       // ABC Top Stories
    cbs:   'https://www.cbsnews.com/latest/rss/main',         // CBS Latest
    fox:   'https://feeds.foxnews.com/foxnews/latest',        // FOX News Latest
    newsnation: "https://www.newsnationnow.com/feed/"         // NewsNation Top Stories
  };

  async function loadFeed(network) {
    const url = rssFeeds[network];
    feedTitle.textContent = `${network.toUpperCase()} Stories`;
    feedStories.innerHTML = '<p style="color:#fff;">Loading...</p>';

    try {
      // Use rss2json proxy to bypass CORS
      const response = await fetch(
        `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`
      );
      const data = await response.json();

      const items = Array.isArray(data.items) ? data.items.slice() : [];

      // Just sort by pubDate if available, but don’t display it
      const normalized = items
        .map(item => ({ item, date: item.pubDate ? new Date(item.pubDate) : null }))
        .filter(x => x.date)
        .sort((a, b) => b.date.getTime() - a.date.getTime());

      feedStories.innerHTML = '';

      if (normalized.length === 0) {
        feedStories.innerHTML = '<p style="color:#fff;">No stories available.</p>';
        return;
      }

      normalized.slice(0, 10).forEach(({ item }) => {
        const story = document.createElement('div');
        story.className = 'story-card';
        story.innerHTML = `
          <a href="${item.link}" target="_blank" rel="noopener noreferrer" style="color:#fff; text-decoration:none;">
            <h4 style="margin-bottom:0.35rem;">${item.title}</h4>
          </a>
        `;
        feedStories.appendChild(story);
      });
    } catch (err) {
      console.error(err);
      feedStories.innerHTML = '<p style="color:#fff;">Error loading feed.</p>';
    }
  }

  document.querySelectorAll('.info-card[data-network]').forEach(card => {
    card.addEventListener('click', () => {
      const network = card.getAttribute('data-network');
      loadFeed(network);
    });
  });
});

// === STATE DROPDOWN WIRING ===
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
  const officialsContainer = document.getElementById('officials-container');
  const searchBar = document.getElementById('search-bar');
  const loadingOverlay = document.getElementById('loading-overlay');

  const officialsModal = document.getElementById('officials-modal');
  const officialsModalContent = document.getElementById('officials-content');
  const officialsModalCloseBtn = document.getElementById('officials-close');

  if (officialsModalCloseBtn) {
    officialsModalCloseBtn.addEventListener('click', () => closeModalWindow('officials-modal'));
  }

  wireSearchBar();
  wireStateDropdown();

  function closeOfficialsSearch() {
    if (!searchBar) return;
    searchBar.value = '';
    searchBar.blur();
  }

  document.addEventListener('mousedown', event => {
    if (!searchBar) return;
    if (event.target !== searchBar && !searchBar.contains(event.target)) {
      closeOfficialsSearch();
    }
  });

  // --- Other existing functions and variables above ---

// Official RSS feeds per network
const rssFeeds = {
  msnbc: 'https://feeds.nbcnews.com/nbcnews/public/news',   // NBC/MSNBC general news
  abc:   'https://abcnews.go.com/abcnews/topstories',       // ABC Top Stories
  cbs:   'https://www.cbsnews.com/latest/rss/main',         // CBS Latest
  fox:   'https://feeds.foxnews.com/foxnews/latest',        // FOX News Latest
  cnn:   'http://rss.cnn.com/rss/cnn_topstories.rss'        // CNN Top Stories
};

// Fetch top 5 stories via rss2json
async function fetchRss(feedUrl) {
  const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`;
  try {
    const response = await fetch(apiUrl);
    const data = await response.json();
    return data.items.slice(0, 5);
  } catch (err) {
    console.error('RSS fetch error:', err);
    return [];
  }
}

// Render network stories
async function renderNetworkStories(network) {
  const feedUrl = rssFeeds[network];
  if (!feedUrl) return;

  const stories = await fetchRss(feedUrl);
  const container = document.getElementById('network-stories');
  container.innerHTML = ''; // clear previous stories

  stories.forEach(item => {
    const card = document.createElement('div');
    card.className = 'official-card';
    card.innerHTML = `<h4>${item.title}</h4>`;
    card.onclick = () => window.open(item.link, '_blank');
    container.appendChild(card);
  });

  // Append "See More" next to last story
  if (stories.length > 0) {
    const seeMore = document.createElement('div');
    seeMore.className = 'see-more';
    seeMore.innerText = 'See More';
    seeMore.onclick = () => {
      // Proper site URL for MSNBC, others open homepage
      const urlMap = {
        msnbc: 'https://www.msnbc.com',
        abc: 'https://abcnews.go.com',
        cbs: 'https://www.cbsnews.com',
        fox: 'https://www.foxnews.com',
        cnn: 'https://edition.cnn.com'
      };
      window.open(urlMap[network] || feedUrl, '_blank');
    };
    container.appendChild(seeMore);
  }
}

// Add click listeners to network cards
document.querySelectorAll('#network-cards .info-card').forEach(card => {
  card.addEventListener('click', () => {
    const network = card.dataset.network;
    renderNetworkStories(network);
  });
});
// === GLOBAL POLITICS & WORLD NEWS: Google News RSS feed ===
const worldNewsFeedUrl = 'https://news.google.com/rss/search?q=world+politics&hl=en-US&gl=US&ceid=US:en';
const maxCards = 25;

// Helper to extract favicon from story source
function getFaviconUrl(link) {
  try {
    const url = new URL(link);
    return `${url.origin}/favicon.ico`;
  } catch {
    return ''; // fallback empty
  }
}

// Fetch RSS via rss2json
async function fetchGoogleNewsRss(feedUrl) {
  try {
    const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`;
    const res = await fetch(apiUrl);
    const data = await res.json();
    return data.items?.slice(0, maxCards) || [];
  } catch (err) {
    console.error('RSS fetch error:', err);
    return [];
  }
}

  // === Load officials data with smooth fade-in ===
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

      // Fade out loading overlay
      if (loadingOverlay) {
        loadingOverlay.style.transition = 'opacity 0.5s ease';
        loadingOverlay.style.opacity = '0';
        setTimeout(() => loadingOverlay.remove(), 500);
      }

      // Load social trends
      const socialFeed = document.getElementById('social-feed');
      if (socialFeed && typeof loadSocialTrends === 'function') {
        console.log("🎬 loadSocialTrends is running...");
        loadSocialTrends();
      }
    })
    .catch(err => {
      console.error('Error loading official data:', err);
      if (loadingOverlay) loadingOverlay.textContent = 'Failed to load data.';
    });
});
document.getElementById("quiz-submit").onclick = () => {
  const selected = document.querySelector('input[name="opt"]:checked');
  if (!selected) {
    alert("Pick an answer!");
    return;
  }
  const q = quizQuestions[currentQuestion];
  const selectedIndex = parseInt(selected.value, 10);
  const correctText = q.options[q.answer];
  const feedbackEl = document.getElementById("quiz-feedback");

  if (selectedIndex === q.answer) {
    score++;
    feedbackEl.className = "correct";
    feedbackEl.innerHTML = `✅ Correct — ${correctText}<br><small>${q.explanation}</small>`;
  } else {
    feedbackEl.className = "incorrect";
    feedbackEl.innerHTML = `❌ Incorrect. Correct answer: ${correctText}<br><small>${q.explanation}</small>`;
  }

  document.getElementById("quiz-submit").style.display = "none";
  document.getElementById("quiz-next").style.display = "inline-block";
};

document.getElementById("quiz-next").onclick = () => {
  currentQuestion++;
  if (currentQuestion < quizQuestions.length) {
    renderQuestion();
  } else {
    document.getElementById("quiz-question").innerHTML = "";
    document.getElementById("quiz-options").innerHTML = "";
    document.getElementById("quiz-progress").textContent = "";
    document.getElementById("quiz-progress-fill").style.width = "100%";
    document.getElementById("quiz-feedback").textContent = "";
    document.getElementById("quiz-score").textContent =
      `Final Score: ${score}/${quizQuestions.length} — ${score >= 12 ? "Pass ✅" : "Try Again ❌"}`;
    document.getElementById("quiz-next").style.display = "none";
  }
};


// === Citizenship & Immigration tab renderer ===
function showCitizenship() {
  showTab('citizenship');

  citizenshipSections.forEach(section => {
    const container = document.getElementById(section.targetId);
    if (!container) {
      console.warn(`Container not found: ${section.targetId}`);
      return;
    }
    container.innerHTML = ''; // Clear any old content

    // Add section header
    const header = document.createElement('h3');
    header.textContent = section.label;
    header.style.marginTop = '40px';
    header.style.marginBottom = '20px';
    header.style.color = '#fff';
    container.appendChild(header);

    // Create grid for cards
    const grid = document.createElement('div');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(300px, 1fr))';
    grid.style.gap = '20px';
    grid.style.padding = '0 10px';

    if (section.items.length === 0) {
      const msg = document.createElement('p');
      msg.textContent = `No items available for ${section.label}.`;
      msg.style.color = '#ccc';
      grid.appendChild(msg);
    } else {
      section.items.forEach(item => {
        const card = document.createElement('div');
        card.style.background = '#2b2b2b';
        card.style.padding = '20px';
        card.style.borderRadius = '10px';
        card.style.border = '1px solid #444';
        card.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';

        let linksHtml = '<div style="margin-top: 15px; line-height: 1.8;">';
        if (item.urlEn) linksHtml += `<a href="${item.urlEn}" target="_blank" rel="noopener noreferrer" style="color: #1e90ff; text-decoration: none;">English Version →</a><br>`;
        if (item.urlEs) linksHtml += `<a href="${item.urlEs}" target="_blank" rel="noopener noreferrer" style="color: #1e90ff; text-decoration: none;">Versión en Español →</a><br>`;
        item.langLinks?.forEach(lang => {
          linksHtml += `<a href="${lang.url}" target="_blank" rel="noopener noreferrer" style="color: #aaa; text-decoration: none; font-size: 0.95em;">${lang.label}</a><br>`;
        });
        linksHtml += '</div>';

        card.innerHTML = `
          <h4 style="margin: 0 0 12px 0; color: #fff;">${item.title}</h4>
          <p style="margin: 0 0 15px 0; color: #ccc; font-size: 0.95em;">${item.desc}</p>
          ${linksHtml}
        `;
        grid.appendChild(card);
      });
    }

    container.appendChild(grid);
  });
}
// ==============================
// Ratings/Rankings — tab renderer
// ==============================

// Define rating categories globally
const ratingCategories = [
  "Honesty","Humility","Transparency","Integrity","Consistency","Accountability","Patience",
  "Government Experience","Foreign Policy Experience","Vision","Resilience","Commitment","Courage",
  "Common Sense","Military Experience","Morality","Intelligence","Ability to Inspire","Creativity",
  "Diplomacy","Emotional intelligence","Determination","Compassion","Confidence","Strategy",
  "Business Experience","Sense of Humor","Patriotism","Leadership","Communication","Charisma",
  "Toughness","Ability to Unify","Effectiveness","Health","Fashion Style","Electability"
];

// Normalize helper: collapse whitespace, strip diacritics, lowercase
function normalizeText(s) {
  return String(s || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s'-]/g, "")     // remove non-word punctuation except apostrophes/hyphens
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

// Show Ratings tab
function showRatings() {
  Promise.all([
    fetch('president-ratings.json').then(res => res.json()),
    fetch('vicepresident-ratings.json').then(res => res.json()),
    fetch('governors-ratings.json').then(res => res.json()),
    fetch('ltgovernors-ratings.json').then(res => res.json()),
    fetch('senators-ratings.json').then(res => res.json()),
    fetch('housereps-ratings.json').then(res => res.json())
  ]).then(([presidents, vps, governors, ltgovs, senators, housereps]) => {
    const ratings = [
      ...presidents, ...vps, ...governors, ...ltgovs, ...senators, ...housereps
    ];

    // Merge saved ratings
    const saved = JSON.parse(localStorage.getItem('ratingsData')) || {};
    ratings.forEach(r => {
      if (saved[r.slug]) {
        r.votes = saved[r.slug].votes;
        r.averageRating = saved[r.slug].averageRating;
      }
    });

    const container = document.getElementById('ratings-cards');
    container.innerHTML = '';

    ratings.forEach(r => {
      const official = window.allOfficials.find(o => o.slug === r.slug);
      if (!official) return;

      const avg = r.averageRating ? r.averageRating.toFixed(1) : '0.0';
      const card = document.createElement('div');
      card.className = 'info-card';

      // Dataset tags for filters (normalized)
      card.dataset.office   = normalizeText(official.office || '');
      card.dataset.state    = normalizeText(official.state || '');
      let partyKey          = normalizeText(official.party || '');
      if (partyKey === 'democratic') partyKey = 'democrat';
      if (partyKey === 'gop')        partyKey = 'republican';
      card.dataset.party    = partyKey;

      // ✅ Full name normalization for robust searching
      const fullNameRaw = String(official.name || '').trim();
      card.dataset.fullname = normalizeText(fullNameRaw);

      // UI name split (first/last) for display only
      const nameParts = fullNameRaw.split(/\s+/);
      const firstName = nameParts.slice(0, -1).join(' ') || nameParts[0] || '';
      const lastName  = nameParts.slice(-1).join(' ') || '';

      // Card markup
      card.innerHTML = `
        <div class="card-left">
          <img src="${official.photo}" alt="${official.name}" class="card-image" />
          <h3 class="name-block">
            <span class="first-name">${firstName}</span>
            <span class="last-name">${lastName}</span>
          </h3>
        </div>
        <div class="card-right">
          <div class="card-info">
            <p class="office">${official.office}</p>
            ${official.state ? `<p class="meta">State: ${official.state}</p>` : ''}
            ${official.district ? `<p class="meta">District: ${official.district}</p>` : ''}
          </div>
          <div class="rating-block">
            <div class="rating-badge" style="color:${getRatingColor(r.averageRating)}">
              ${avg} ★
            </div>
            <button class="btn-view" onclick="openRatingsModal('${r.slug}')">View Ratings</button>
          </div>
        </div>
      `;
      container.appendChild(card);
    });

    // Extract numeric GovTrack ID from a govtrackLink URL
function getGovTrackId(link) {
  if (!link || typeof link !== 'string') return null;
  const match = link.match(/\/(\d+)(?:\/|$)/);
  return match ? Number(match[1]) : null;
}

// --- GovTrack metrics fetcher (Rankings tab) ---
async function fetchGovTrackMetrics(official) {
  try {
    const res = await fetch('/data/govtrack.json');
    if (!res.ok) return null;
    const allData = await res.json();

    const id = getGovTrackId(official.govtrackLink);
    const match = allData.find(p => p.id === Number(id));

    if (!match) return null;

    return {
      bills_cosponsored: match.roles?.[0]?.bills_cosponsored || 0,
      bills_sponsored: match.roles?.[0]?.bills_sponsored || 0,
      missed_votes: match.roles?.[0]?.missed_votes_pct || 0,
      ideology_score: match.roles?.[0]?.ideology_score || null,
      leadership_score: match.roles?.[0]?.leadership_score || null
    };
  } catch (e) {
    console.error('GovTrack local fetch failed', e);
    return null;
  }
}

    // After render, apply filters once to reflect any defaults
    applyRatingsFilters();
  });
}

// Robust tokenized search + office/state/party filters
(function initRatingsSearchFilters() {
  const searchEl  = document.getElementById('searchInput');
  const officeSel = document.getElementById('officeFilter');
  const stateSel  = document.getElementById('stateFilter');
  const partySel  = document.getElementById('partyFilter');
  const container = document.getElementById('ratings-cards');
  if (!searchEl || !officeSel || !stateSel || !partySel || !container) return;

  const normalize = s => String(s || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  const isAll = v => {
    const x = normalize(v);
    return !x || x === 'all' || x.startsWith('all ');
  };

  function applyFilters() {
    const tokens = normalize(searchEl.value).split(' ').filter(Boolean);
    const office = normalize(officeSel.value);
    const state  = normalize(stateSel.value);
    const party  = normalize(partySel.value);

    container.querySelectorAll('.info-card').forEach(card => {
      const fullName = normalize(card.dataset.fullname || '');
      const officeKey = card.dataset.office || '';
      const stateKey  = card.dataset.state || '';
      const partyKey  = card.dataset.party || '';

      // ✅ Every token must be present in the full name
      const matchesText   = !tokens.length || tokens.every(t => fullName.includes(t));
      const matchesOffice = isAll(office) || officeKey.includes(office);
      const matchesState  = isAll(state)  || stateKey.includes(state);
      const matchesParty  = isAll(party)  || partyKey.includes(party);

      card.style.display = (matchesText && matchesOffice && matchesState && matchesParty) ? '' : 'none';
    });
  }

  searchEl.addEventListener('input', applyFilters);
  officeSel.addEventListener('change', applyFilters);
  stateSel.addEventListener('change', applyFilters);
  partySel.addEventListener('change', applyFilters);

  // Run once on load
  applyFilters();
})();

// Open Ratings Modal
function openRatingsModal(slug) {
  Promise.all([
    fetch('president-ratings.json').then(res => res.json()),
    fetch('vicepresident-ratings.json').then(res => res.json()),
    fetch('governors-ratings.json').then(res => res.json()),
    fetch('ltgovernors-ratings.json').then(res => res.json()),
    fetch('senators-ratings.json').then(res => res.json()),
    fetch('housereps-ratings.json').then(res => res.json())
  ]).then(([presidents, vps, governors, ltgovs, senators, housereps]) => {
    let ratings = [
      ...presidents,
      ...vps,
      ...governors,
      ...ltgovs,
      ...senators,
      ...housereps
    ];

    const saved = JSON.parse(localStorage.getItem('ratingsData')) || {};
    ratings.forEach(r => {
      if (saved[r.slug]) {
        r.votes = saved[r.slug].votes;
        r.averageRating = saved[r.slug].averageRating;
      }
    });

    const ratingEntry = ratings.find(r => r.slug === slug);
    const official = window.allOfficials.find(o => o.slug === slug);
    if (!official || !ratingEntry) return;

    // Populate modal fields
    document.getElementById('ratings-modal-title').textContent = official.name;
    document.getElementById('ratings-modal-photo').src = official.photo;
    let positionText = official.office;
    if (official.state) positionText += ` — ${official.state}`;
    if (official.district) positionText += `, District ${official.district}`;
    document.getElementById('ratings-modal-position').textContent = positionText;

    // Build category averages + vote counts
    let details = '';
    for (const category of ratingCategories) {
      const votes = ratingEntry.votes[category] || [];
      const avg = votes.length ? (votes.reduce((a,b)=>a+b,0)/votes.length).toFixed(1) : 'N/A';
      const color = avg !== 'N/A' ? getRatingColor(avg) : '#ccc';
      details += `
        <div class="rating-cell">
          <span class="category-label">${category}</span>
          <span class="avg-rating" style="color:${color};">${avg} ★</span>
          <span class="vote-count">(${votes.length} votes)</span>
        </div>
      `;
    }
    document.getElementById('ratings-details').innerHTML = details;

    // Show modal
    document.getElementById('ratings-modal').style.display = 'block';

    // Build rating form dynamically
    const form = document.getElementById('rate-form');
    form.innerHTML = ratingCategories.map(cat => `
      <div class="rating-row">
        <span class="category-label">${cat}</span>
        <span class="star-rating" data-category="${cat}"></span>
      </div>
    `).join('') + `
      <button type="submit" id="submit-rating-btn" class="btn-modern">Submit Rating</button>
    `;
    initStarRatings();

    // Handle rating form submission
    document.getElementById('rate-form').onsubmit = function(e) {
      e.preventDefault();

      const officialName = document.getElementById('ratings-modal-title').textContent;
      const official = window.allOfficials.find(o => o.name === officialName);
      if (!official) return;

      const saved = JSON.parse(localStorage.getItem('ratingsData')) || {};
      let ratingEntry = saved[official.slug];
      if (!ratingEntry) {
        ratingEntry = { votes: {}, averageRating: 0 };
        ratingCategories.forEach(cat => ratingEntry.votes[cat] = []);
        saved[official.slug] = ratingEntry;
      }

      // Collect star selections
      document.querySelectorAll('#rate-modal .star-rating').forEach(span => {
        const category = span.dataset.category;
        const selected = parseInt(span.dataset.selected || 0);
        if (selected > 0) {
          ratingEntry.votes[category].push(selected);
        }
      });

      // Recalculate average
      let total = 0, count = 0;
      for (const category in ratingEntry.votes) {
        const votes = ratingEntry.votes[category];
        total += votes.reduce((a,b)=>a+b,0);
        count += votes.length;
      }
      ratingEntry.averageRating = count ? total / count : 0;

      // Save back to localStorage
      saved[official.slug] = {
        votes: ratingEntry.votes,
        averageRating: ratingEntry.averageRating
      };
      localStorage.setItem('ratingsData', JSON.stringify(saved));

      // Update modal details
      let updatedDetails = '';
      for (const category of ratingCategories) {
        const votes = ratingEntry.votes[category] || [];
        const avg = votes.length ? (votes.reduce((a,b)=>a+b,0)/votes.length).toFixed(1) : 'N/A';
        const color = avg !== 'N/A' ? getRatingColor(avg) : '#ccc';
        updatedDetails += `<p style="font-size:18px;">
          <span class="category-label">${category}:</span>
          <span style="color:${color}; font-size:22px; font-weight:bold;">${avg} ★</span>
          (${votes.length} votes)
        </p>`;
      }
      document.getElementById('ratings-details').innerHTML = updatedDetails;

      // Update card badge in Ratings tab
      const badge = document.querySelector(
        `button[onclick="openRatingsModal('${official.slug}')"]`
      ).previousElementSibling;
      if (badge) {
        badge.textContent = `${Math.round(ratingEntry.averageRating)} ★`;
        badge.style.color = getRatingColor(ratingEntry.averageRating);
      }

      // Reset stars
      initStarRatings();

      // Close rate modal
      closeModal('rate-modal');
    };
  });
}

// Star rating initializer
function initStarRatings() {
  const stars = document.querySelectorAll('#rate-modal .star-rating');
  stars.forEach(span => {
    span.innerHTML = '';
    span.dataset.selected = '';

    for (let i = 1; i <= 5; i++) {
      const star = document.createElement('span');
      star.textContent = '★';
      star.dataset.value = i;
      star.style.fontSize = '28px';
      star.style.cursor = 'pointer';

      star.addEventListener('click', function () {
        // Clear previous selection
        span.querySelectorAll('span').forEach(s => {
          s.classList.remove('filled');
          s.style.color = '';
        });

        // Fill stars up to the clicked one
        for (let j = 1; j <= i; j++) {
          const s = span.querySelector(`span[data-value="${j}"]`);
          if (s) {
            s.classList.add('filled');
            s.style.color = getRatingColor(j);
          }
        }

        // Save selected value
        span.dataset.selected = String(i);
      });

      span.appendChild(star);
    }
  });
}

// Rating color helper
function getRatingColor(avg) {
  const rounded = Math.round(avg);
  switch (rounded) {
    case 5: return 'gold';
    case 4: return 'green';
    case 3: return 'yellow';
    case 2: return 'orange';
    case 1: return 'red';
    default: return '#ccc';
  }
}

// Modal closer
function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.style.display = 'none';
  }
}

// Hook up the "Rate Me" button
document.getElementById('rate-me-btn').onclick = function() {
  const title = document.getElementById('ratings-modal-title').textContent;
  document.getElementById('rate-modal-title').textContent = `Rate ${title}`;
  document.getElementById('rate-modal').style.display = 'block';
  initStarRatings();
};
// Ratings & Rankings — section toggle
(function initRatingsRankingsToggle() {
  const btnRatings  = document.getElementById('btn-ratings');
  const btnRankings = document.getElementById('btn-rankings');
  const ratingsSec  = document.getElementById('ratings-section');
  const rankingsSec = document.getElementById('rankings-section');

  if (!btnRatings || !btnRankings || !ratingsSec || !rankingsSec) return;

  function activateRatings() {
    btnRatings.classList.add('rr-tab-active');
    btnRankings.classList.remove('rr-tab-active');
    ratingsSec.classList.add('rr-section-active');
    rankingsSec.classList.remove('rr-section-active');
    ratingsSec.removeAttribute('aria-hidden');
    rankingsSec.setAttribute('aria-hidden', 'true');
  }

  function activateRankings() {
    btnRankings.classList.add('rr-tab-active');
    btnRatings.classList.remove('rr-tab-active');
    rankingsSec.classList.add('rr-section-active');
    ratingsSec.classList.remove('rr-section-active');
    rankingsSec.removeAttribute('aria-hidden');
    rankingsSec.setAttribute('aria-hidden', 'false');
  }

  btnRatings.addEventListener('click', activateRatings);
  btnRankings.addEventListener('click', () => {
    activateRankings();
    // Trigger leaderboard render when Rankings opens
    if (typeof window.renderRankingsLeaderboard === 'function') {
      window.renderRankingsLeaderboard();
    }
  });

  // Default: Ratings active
  activateRatings();
})();

// Rankings — Top 10 render by office (ratings + GovTrack metrics)
(function initRankingsRender() {
  const officeSel   = document.getElementById('rankingsOfficeFilter');
  const categorySel = document.getElementById('rankingsCategoryFilter');
  const tableBody   = document.querySelector('#rankings-leaderboard tbody');

  if (!officeSel || !categorySel || !tableBody) return;

  function getSavedRatings() {
    try { return JSON.parse(localStorage.getItem('ratingsData')) || {}; }
    catch { return {}; }
  }

  async function computePowerScore(official, saved) {
    const entry = saved[official.slug];
    const avg = entry && typeof entry.averageRating === 'number' ? entry.averageRating : 0;
    const ratingsScore = Math.max(0, Math.min(100, (avg / 5) * 100));

    // Pull GovTrack metrics
    const metrics = await fetchGovTrackMetrics(official);
    if (!metrics) {
      return ratingsScore; // fallback if no GovTrack data
    }

    // Example hybrid weighting
    const govScore =
      (metrics.bills_cosponsored * 0.1) +
      (metrics.bills_sponsored * 0.2) -
      (metrics.missed_votes * 0.5) +
      (metrics.ideology_score * 0.3) +
      (metrics.leadership_score * 0.4);

    return Math.round((ratingsScore + govScore) / 2);
  }

  async function render() {
    const office = (officeSel.value || '').toLowerCase();
    const saved = getSavedRatings();

    const officials = (window.allOfficials || [])
      .filter(o => (o.office || '').toLowerCase() === office);

    // Build rows with scores
    const rows = [];
    for (const o of officials) {
      const score = await computePowerScore(o, saved);
      rows.push({ official: o, score, streak: '' });
    }

    // Sort desc, take Top 10
    rows.sort((a, b) => b.score - a.score);
    const top10 = rows.slice(0, 10);

    // Render table
    tableBody.innerHTML = '';
    top10.forEach((row, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${idx + 1}</td>
        <td>${row.official.name}</td>
        <td>${row.official.office}</td>
        <td>${row.score.toFixed(1)}</td>
        <td>${row.streak}</td>
      `;
      tableBody.appendChild(tr);
    });
  }

  window.renderRankingsLeaderboard = render;
  officeSel.addEventListener('change', render);
  categorySel.addEventListener('change', render);
})();
