// === FAVORITES STORAGE & HELPERS ===
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

  const allOfficials = [
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

// === Polls tab renderer ===
function showPolls() {
  showTab('polls');
  const container = document.getElementById('polls-cards');
  container.innerHTML = '';

  pollCategories.forEach(category => {
    const section = document.createElement('div');
    section.className = 'poll-section';

    const header = document.createElement('h3');
    header.textContent = category.label;
    section.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'poll-grid';

    category.polls.forEach(poll => {
      const card = document.createElement('div');
      card.className = 'poll-card';
      card.innerHTML = `
        <img src="assets/${poll.logo}" alt="${poll.source} logo" class="poll-logo">
        <h4>${poll.name}</h4>
        <p>From ${poll.source}</p>
        <a href="${poll.url}" target="_blank" rel="noopener noreferrer" class="btn">View Polls</a>
      `;
      grid.appendChild(card);
    });

    section.appendChild(grid);
    container.appendChild(section);
  });
}

// === Voting tab renderer ===
function showVoting() {
  showTab('voting');
  const container = document.getElementById('voting-cards');
  container.innerHTML = '';

  // Load voting-data.json
  fetch('voting-data.json')
    .then(res => res.json())
    .then(data => {
      const stateData = data[selectedState] || data['North Carolina'];

      Object.entries(stateData).forEach(([key, info]) => {
        if (!info || !info.url) return;
        const card = document.createElement('div');
        card.className = 'voting-card';
        card.innerHTML = `
          <h3>${info.title || key}</h3>
          <p>${info.desc || ''}</p>
          <a href="${info.url}" target="_blank" class="btn">Go to Site</a>
        `;
        container.appendChild(card);
      });
    })
    .catch(err => {
      container.innerHTML = '<p>Error loading voting info.</p>';
      console.error(err);
    });
}

// === Citizenship tab renderer ===
function showCitizenship() {
  showTab('citizenship');
  const container = document.getElementById('citizenship-cards');
  container.innerHTML = '';

  citizenshipSections.forEach(section => {
    const secEl = document.createElement('div');
    secEl.className = 'citizenship-section';
    const header = document.createElement('h3');
    header.textContent = section.label;
    secEl.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'citizenship-grid';

    section.items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'citizenship-card';
      card.innerHTML = `
        <h4>${item.title}</h4>
        <p>${item.desc}</p>
        <a href="${item.urlEn}" target="_blank" class="btn">English</a>
        ${item.urlEs ? `<a href="${item.urlEs}" target="_blank" class="btn">Español</a>` : ''}
      `;
      grid.appendChild(card);
    });

    secEl.appendChild(grid);
    container.appendChild(secEl);
  });
}

// === Community tab ===
function showCommunity() {
  showTab('community');
  // Static cards - no dynamic load needed
}

// === Civic Intelligence tab ===
function showCivic() {
  showTab('civic');
  // Add your calendar or dashboard code here if needed
  const container = document.getElementById('calendar');
  if (container) container.innerHTML = '<p>Civic dashboard loading...</p>';
}

// === Organizations tab ===
function showOrganizations() {
  showTab('organizations');
  // Static cards
}

// === Learning Resources tab ===
function showTab(id) {
  // Your existing showTab code
}
// === RATINGS CATEGORIES ===
const ratingCategories = [
  'Leadership',
  'Integrity',
  'Effectiveness',
  'Communication',
  'Policy Impact'
];

// === Show Ratings tab ===
function showRatings() {
  showTab('ratings');

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

    const container = document.getElementById('ratings-cards');
    container.innerHTML = '';

    ratings.forEach(r => {
      const official = allOfficials.find(o => o.slug === r.slug);
      if (!official) return;

      const card = document.createElement('div');
      card.className = 'info-card';
      const avg = r.averageRating ? r.averageRating.toFixed(1) : '0.0';
      card.innerHTML = `
        <img src="${official.photo}" alt="${official.name}" class="card-image" />
        <h3>${official.name}</h3>
        <p>${official.office}</p>
        <div class="rating-badge" style="color:${getRatingColor(r.averageRating)}">
          ${avg} ★
        </div>
        <button class="btn-view" onclick="openRatingsModal('${r.slug}')">View Ratings</button>
      `;
      container.appendChild(card);
    });
  }).catch(err => {
    console.error('Error loading ratings data:', err);
    const container = document.getElementById('ratings-cards');
    if (container) container.innerHTML = '<p style="color:red;">Error loading ratings data.</p>';
  });
}

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
    const official = allOfficials.find(o => o.slug === slug);
    if (!official || !ratingEntry) return;

    // Populate modal fields
    document.getElementById('ratings-modal-title').textContent = official.name;
    document.getElementById('ratings-modal-photo').src = official.photo;
    document.getElementById('ratings-modal-position').textContent = official.office;

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
      const official = allOfficials.find(o => o.name === officialName);
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
        span.querySelectorAll('span').forEach(s => {
          s.classList.remove('filled');
          s.style.color = '';
        });
        for (let j = 1; j <= i; j++) {
          const s = span.querySelector(`span[data-value="${j}"]`);
          if (s) {
            s.classList.add('filled');
            s.style.color = getRatingColor(j);
          }
        }
        span.dataset.selected = String(i);
      });

      span.appendChild(star);
    }
  });
}

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

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.style.display = 'none';
  }
}

document.getElementById('rate-me-btn').onclick = function() {
  const title = document.getElementById('ratings-modal-title').textContent;
  document.getElementById('rate-modal-title').textContent = `Rate ${title}`;
  document.getElementById('rate-modal').style.display = 'block';
  initStarRatings();
};
// === DOM Ready - FINAL INITIALIZATION ===
document.addEventListener('DOMContentLoaded', () => {
  // Make selectedState available globally (in case it's not set yet)
  if (!window.selectedState) {
    window.selectedState = localStorage.getItem('selectedState') || 'North Carolina';
  }

  // Hamburger menu toggle + click-outside close
  const hamburger = document.getElementById('hamburger');
  const menu = document.getElementById('hamburger-menu');
  if (hamburger && menu) {
    hamburger.addEventListener('click', () => {
      menu.classList.toggle('open');
    });

    // Close when clicking a link
    document.querySelectorAll('#hamburger-menu ul li a').forEach(link => {
      link.addEventListener('click', () => {
        document.querySelectorAll('#hamburger-menu ul li a')
          .forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        menu.classList.remove('open');
      });
    });

    // Close when clicking outside
    document.addEventListener('click', (event) => {
      if (menu.classList.contains('open') && 
          !menu.contains(event.target) && 
          !hamburger.contains(event.target)) {
        menu.classList.remove('open');
      }
    });
  }

  // State dropdown wiring
  const stateSelect = document.getElementById('state-dropdown');
  if (stateSelect) {
    stateSelect.value = window.selectedState;
    stateSelect.addEventListener('change', (e) => {
      window.selectedState = e.target.value;
      localStorage.setItem('selectedState', window.selectedState);
      if (typeof renderOfficials === 'function') {
        renderOfficials(window.selectedState, document.getElementById('search-bar')?.value || '');
      }
    });
  }

  // Officials search bar wiring
  const searchBar = document.getElementById('search-bar');
  if (searchBar) {
    searchBar.addEventListener('input', (e) => {
      renderOfficials(window.selectedState, e.target.value);
    });
  }

  // RSS feed wiring for network cards
  const feedTitle = document.getElementById('feed-title');
  const feedStories = document.getElementById('feed-stories');

  const rssFeeds = {
    livenowfox: 'https://feeds.foxnews.com/foxnews/latest',
    msnbc: 'https://feeds.nbcnews.com/nbcnews/public/news',
    abc: 'https://abcnews.go.com/abcnews/topstories',
    cbs: 'https://www.cbsnews.com/latest/rss/main',
    fox: 'https://feeds.foxnews.com/foxnews/latest',
    newsnation: 'https://www.newsnationnow.com/feed/'
  };

  async function loadFeed(network) {
    const url = rssFeeds[network];
    if (!url) return;

    feedTitle.textContent = `${network.toUpperCase()} Stories`;
    feedStories.innerHTML = '<p style="color:#fff;">Loading...</p>';

    try {
      const response = await fetch(
        `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`
      );
      const data = await response.json();

      const items = Array.isArray(data.items) ? data.items : [];

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

  // Wire network cards
  document.querySelectorAll('.network-card[data-network]').forEach(card => {
    card.addEventListener('click', () => {
      const network = card.getAttribute('data-network');
      if (network) loadFeed(network);
    });
  });

  // Load carousels (world, finance, economy)
  (async () => {
    await loadSection("world", "world-news-carousel");
    await loadSection("finance", "finance-carousel");
    await loadSection("economy", "economy-carousel");

    setupControls("world-news-carousel");
    setupControls("finance-carousel");
    setupControls("economy-carousel");
  })();

  // Show Home Hub on load
  showStartupHub();
});
// === DOM Ready ===
document.addEventListener('DOMContentLoaded', () => {
  // Hamburger toggle + active tab + click-outside close
  const hamburger = document.getElementById('hamburger');
  const menu = document.getElementById('hamburger-menu');
  if (hamburger && menu) {
    hamburger.addEventListener('click', () => {
      menu.classList.toggle('open');
    });

    document.querySelectorAll('#hamburger-menu ul li a').forEach(link => {
      link.addEventListener('click', () => {
        document.querySelectorAll('#hamburger-menu ul li a')
          .forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        menu.classList.remove('open');
      });
    });

    document.addEventListener('click', (event) => {
      if (!menu.contains(event.target) && !hamburger.contains(event.target)) {
        menu.classList.remove('open');
      }
    });
  }

  // State dropdown wiring
  const stateSelect = document.getElementById('state-dropdown');
  if (stateSelect) {
    stateSelect.addEventListener('change', (e) => {
      window.selectedState = e.target.value;
      if (typeof renderOfficials === 'function') {
        renderOfficials(window.selectedState, '');
      }
    });
  }

  // Officials search bar wiring
  wireSearchBar();

  // Force Home Hub tab to show on page load
  showStartupHub();
});
