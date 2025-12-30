// ==================== GLOBALS & FAVORITES ====================
let selectedState = localStorage.getItem('selectedState') || 'North Carolina';
let allOfficials = [];
let podcastsData = [];
let showsData = [];

const favorites = JSON.parse(localStorage.getItem('favorites') || '{"podcasts":[],"shows":[]}');

function saveFavorites() {
  localStorage.setItem('favorites', JSON.stringify(favorites));
}

function isFavorite(type, title) {
  return favorites[type]?.includes(title) || false;
}

function toggleFavorite(type, title) {
  if (!favorites[type]) favorites[type] = [];
  const index = favorites[type].indexOf(title);
  if (index > -1) {
    favorites[type].splice(index, 1);
  } else {
    favorites[type].push(title);
  }
  saveFavorites();
  return index === -1; // returns true if newly added
}

function updateFavoriteButton(btn, isFav) {
  btn.textContent = isFav ? '✓ Favorited' : '☆ Favorite';
  btn.classList.toggle('favorited', isFav);
}

// ==================== TAB SWITCHING ====================
function showTab(id) {
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.style.display = 'none';
  });
  const target = document.getElementById(id);
  if (target) target.style.display = 'block';
}

function showStartupHub() { showTab('startup-hub'); loadCarousels(); loadNetworkFeeds(); }
function showPodcastsShows() { showTab('podcasts-shows'); renderPodcastsShows(); }
function showPolls() { showTab('polls'); renderPollsAndElections(); }
function showVoting() { showTab('voting'); renderVotingInfo(); }
function showCitizenship() { showTab('citizenship'); renderCitizenship(); }
function showRatings() { showTab('ratings'); renderRatings(); }

// ==================== HAMBURGER MENU ====================
document.addEventListener('DOMContentLoaded', () => {
  const hamburger = document.getElementById('hamburger');
  const menu = document.getElementById('hamburger-menu');

  hamburger.addEventListener('click', () => {
    menu.classList.toggle('open');
  });

  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!menu.contains(e.target) && !hamburger.contains(e.target)) {
      menu.classList.remove('open');
    }
  });

  // Close menu when clicking a link
  menu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => menu.classList.remove('open'));
  });
});
// ==================== DATA LOADING ====================
async function loadAllData() {
  const loadingOverlay = document.getElementById('loading-overlay');
  try {
    const [federalRes, cabinetRes, senatorsRes, repsRes, governorsRes, ltGovRes, scotusRes] = await Promise.all([
      fetch('federalOfficials.json').then(r => r.ok ? r.json() : []),
      fetch('cabinet.json').then(r => r.ok ? r.json() : []),
      fetch('senators.json').then(r => r.ok ? r.json() : []),
      fetch('housereps.json').then(r => r.ok ? r.json() : []),
      fetch('governors.json').then(r => r.ok ? r.json() : []),
      fetch('ltgovernors.json').then(r => r.ok ? r.json() : []),
      fetch('scotus.json').then(r => r.ok ? r.json() : [])
    ]);

    allOfficials = [...federalRes, ...cabinetRes, ...senatorsRes, ...repsRes, ...governorsRes, ...ltGovRes, ...scotusRes];

    // Load podcasts & shows
    [podcastsData, showsData] = await Promise.all([
      fetch('podcasts.json').then(r => r.ok ? r.json() : []),
      fetch('shows.json').then(r => r.ok ? r.json() : [])
    ]);

    renderOfficials(selectedState, '');
    if (loadingOverlay) loadingOverlay.style.display = 'none';

  } catch (err) {
    console.error('Data loading failed:', err);
    if (loadingOverlay) loadingOverlay.textContent = 'Error loading data.';
  }
}

// ==================== MY OFFICIALS RENDERING ====================
function renderOfficials(state, filter = '') {
  const container = document.getElementById('officials-container');
  if (!container || allOfficials.length === 0) return;

  container.innerHTML = '';

  const filtered = allOfficials.filter(o => {
    const matchesState = !o.state || o.state === state;
    const matchesFilter = !filter || 
      o.name.toLowerCase().includes(filter.toLowerCase()) ||
      o.office.toLowerCase().includes(filter.toLowerCase());
    return matchesState && matchesFilter;
  });

  if (filtered.length === 0) {
    container.innerHTML = '<p style="grid-column:1/-1; text-align:center; color:#aaa;">No officials found.</p>';
    return;
  }

  filtered.forEach(o => {
    const card = document.createElement('div');
    card.className = 'info-card official-card';
    card.innerHTML = `
      <img src="${o.photo || 'assets/default-photo.png'}" alt="${o.name}" class="card-image" onerror="this.src='assets/default-photo.png'">
      <h3>${o.name}</h3>
      <p>${o.office || 'Official'}</p>
      <p style="font-size:0.9rem; color:#aaa;">${o.party || ''} • ${o.state || 'Federal'}</p>
      <button class="btn" onclick="openOfficialModal('${o.slug || o.name.replace(/\s+/g, '-') }')">View Details</button>
    `;
    container.appendChild(card);
  });
}

// ==================== SEARCH & STATE DROPDOWN ====================
document.addEventListener('DOMContentLoaded', () => {
  const stateDropdown = document.getElementById('state-dropdown');
  const searchBar = document.getElementById('search-bar');

  if (stateDropdown) {
    stateDropdown.value = selectedState;
    stateDropdown.addEventListener('change', (e) => {
      selectedState = e.target.value;
      localStorage.setItem('selectedState', selectedState);
      renderOfficials(selectedState, searchBar?.value || '');
    });
  }

  if (searchBar) {
    searchBar.addEventListener('input', (e) => {
      renderOfficials(selectedState, e.target.value);
    });
  }
});
// ==================== CAROUSELS (World, Finance, Economy) ====================
const feeds = {
  world: [
    "https://feeds.reuters.com/reuters/worldNews",
    "https://www.aljazeera.com/xml/rss/all.xml",
    "https://www.theguardian.com/world/rss"
  ],
  finance: [
    "https://www.investing.com/rss/news.rss",
    "https://www.cnbc.com/id/10001147/device/rss/rss.xml"
  ],
  economy: [
    "https://www.investing.com/rss/news_25.rss",
    "https://www.cnbc.com/id/20910258/device/rss/rss.xml"
  ]
};

async function loadCarousel(section, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const track = document.createElement('div');
  track.className = 'carousel-track';
  container.innerHTML = '';
  container.appendChild(track);

  let allItems = [];
  for (const url of feeds[section]) {
    try {
      const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`);
      const data = await res.json();
      allItems.push(...(data.items || []));
    } catch (e) { console.error('RSS error:', e); }
  }

  allItems.slice(0, 30).forEach(item => {
    const img = item.thumbnail || (item.content?.match(/src="([^"]+)"/)?.[1]) || 'assets/default-thumb.png';
    const card = document.createElement('a');
    card.href = item.link;
    card.target = '_blank';
    card.rel = 'noopener noreferrer';
    card.className = 'carousel-card';
    card.setAttribute('data-title', item.title);
    card.setAttribute('data-date', new Date(item.pubDate).toLocaleDateString());
    card.innerHTML = `<img src="${img}" alt="" class="carousel-img">`;
    track.appendChild(card);
  });

  setupCarouselControls(containerId);
}

function setupCarouselControls(id) {
  const track = document.querySelector(`#${id} .carousel-track`);
  const prev = document.querySelector(`.prev[data-target="${id}"]`);
  const next = document.querySelector(`.next[data-target="${id}"]`);
  if (!track || !prev || !next) return;

  let pos = 0;
  const step = 356;

  prev.onclick = () => {
    pos = Math.max(0, pos - 1);
    track.style.transform = `translateX(-${pos * step}px)`;
  };

  next.onclick = () => {
    pos = Math.min(track.children.length - 3, pos + 1);
    track.style.transform = `translateX(-${pos * step}px)`;
  };

  // Auto-scroll
  setInterval(() => {
    pos = (pos + 1) % track.children.length;
    track.style.transform = `translateX(-${pos * step}px)`;
  }, 6000);
}

async function loadCarousels() {
  await loadCarousel('world', 'world-news-carousel');
  await loadCarousel('finance', 'finance-carousel');
  await loadCarousel('economy', 'economy-carousel');
}

// ==================== NETWORK RSS FEEDS ====================
const networkFeeds = {
  livenowfox: 'https://feeds.foxnews.com/foxnews/latest',
  msnbc: 'https://feeds.nbcnews.com/nbcnews/public/news',
  abc: 'https://abcnews.go.com/abcnews/topstories',
  cbs: 'https://www.cbsnews.com/latest/rss/main',
  fox: 'https://feeds.foxnews.com/foxnews/latest',
  newsnation: 'https://www.newsnationnow.com/feed/'
};

async function loadNetworkFeed(network) {
  const titleEl = document.getElementById('feed-title');
  const storiesEl = document.getElementById('feed-stories');
  titleEl.textContent = network.toUpperCase() + ' Stories';
  storiesEl.innerHTML = '<p>Loading...</p>';

  try {
    const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(networkFeeds[network])}`);
    const data = await res.json();
    storiesEl.innerHTML = '';
    (data.items || []).slice(0, 10).forEach(item => {
      const div = document.createElement('div');
      div.className = 'info-card';
      div.innerHTML = `<h4><a href="${item.link}" target="_blank" rel="noopener noreferrer">${item.title}</a></h4>`;
      storiesEl.appendChild(div);
    });
  } catch (e) {
    storiesEl.innerHTML = '<p>Error loading feed.</p>';
  }
}

function loadNetworkFeeds() {
  document.querySelectorAll('.network-card').forEach(card => {
    card.addEventListener('click', (e) => {
      const net = card.dataset.network;
      if (net) loadNetworkFeed(net);
    });
  });
}

// ==================== PODCASTS & SHOWS RENDERING ====================
function renderPodcastsShows() {
  const container = document.getElementById('podcasts-cards');
  if (!container) return;
  container.innerHTML = '';

  const renderSection = (title, items, type) => {
    if (items.length === 0) return;

    const section = document.createElement('div');
    section.innerHTML = `<h3 style="grid-column:1/-1; margin:40px 0 20px;">${title}</h3>`;
    const grid = document.createElement('div');
    grid.className = 'grid';

    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'info-card podcast-show-card';
      const logo = item.logo_slug ? `assets/${item.logo_slug}` : 'assets/default-logo.png';
      const isFav = isFavorite(type, item.title);

      card.innerHTML = `
        <img src="${logo}" alt="${item.title}" class="card-image" onerror="this.src='assets/default-logo.png'">
        <h3>${item.title}</h3>
        <p>${item.category || ''} • ${item.source || ''}</p>
        <p>${item.descriptor || ''}</p>
        <button class="btn favorite-btn">${isFav ? '✓ Favorited' : '☆ Favorite'}</button>
      `;

      card.querySelector('.favorite-btn').addEventListener('click', () => {
        const nowFav = toggleFavorite(type, item.title);
        updateFavoriteButton(card.querySelector('.favorite-btn'), nowFav);
      });

      if (item.official_url) {
        card.style.cursor = 'pointer';
        card.addEventListener('click', (e) => {
          if (!e.target.classList.contains('favorite-btn')) {
            window.open(item.official_url, '_blank');
          }
        });
      }

      grid.appendChild(card);
    });

    section.appendChild(grid);
    container.appendChild(section);
  };

  // Favorites first
  const favItems = [];
  favorites.podcasts.forEach(t => {
    const p = podcastsData.find(x => x.title === t);
    if (p) favItems.push({ ...p, type: 'podcasts' });
  });
  favorites.shows.forEach(t => {
    const s = showsData.find(x => x.title === t);
    if (s) favItems.push({ ...s, type: 'shows' });
  });

  renderSection('Your Favorites', favItems);
  renderSection('Podcasts', podcastsData, 'podcasts');
  renderSection('Shows', showsData, 'shows');

  // Search filter
  const search = document.getElementById('podcasts-search-bar');
  if (search) {
    search.addEventListener('input', () => {
      const term = search.value.toLowerCase();
      container.querySelectorAll('.podcast-show-card').forEach(card => {
        const text = card.textContent.toLowerCase();
        card.style.display = text.includes(term) ? '' : 'none';
      });
    });
  }
}
// ==================== MODALS ====================
function closeModal(id) {
  document.getElementById(id).style.display = 'none';
}

function openOfficialModal(slug) {
  const official = allOfficials.find(o => (o.slug || o.name.replace(/\s+/g, '-')) === slug);
  if (!official) return;

  const content = document.getElementById('officials-content');
  content.innerHTML = `
    <h2 style="text-align:center;">${official.name}</h2>
    <img src="${official.photo || 'assets/default-photo.png'}" alt="${official.name}" style="width:200px; border-radius:50%; display:block; margin:20px auto;">
    <p><strong>Office:</strong> ${official.office}</p>
    <p><strong>Party:</strong> ${official.party || 'N/A'}</p>
    <p><strong>State:</strong> ${official.state || 'Federal'}</p>
    ${official.bio ? `<p><strong>Bio:</strong> ${official.bio}</p>` : ''}
    ${official.website ? `<p><a href="${official.website}" target="_blank">Official Website</a></p>` : ''}
  `;

  document.getElementById('officials-modal').style.display = 'flex';
}

// ==================== POLLS & ELECTIONS (Static - can be expanded) ====================
function renderPollsAndElections() {
  // Your pollCategories array and render logic here (from original)
  // For now, placeholder
  document.getElementById('polls-cards').innerHTML = '<p style="grid-column:1/-1; text-align:center;">Polls coming soon.</p>';
}

// ==================== RATINGS (Placeholder - full system on request) ====================
function renderRatings() {
  document.getElementById('ratings-cards').innerHTML = '<p style="grid-column:1/-1; text-align:center;">Ratings system loading...</p>';
}

// ==================== CITIZENSHIP (Placeholder) ====================
function renderCitizenship() {
  document.getElementById('citizenship-cards').innerHTML = '<p style="grid-column:1/-1; text-align:center;">Resources loading...</p>';
}

// ==================== VOTING INFO (from voting-data.json) ====================
async function renderVotingInfo() {
  const container = document.getElementById('voting-cards');
  try {
    const res = await fetch('voting-data.json');
    const data = await res.json();
    const stateData = data[selectedState] || data['North Carolina'];

    container.innerHTML = '';
    Object.entries(stateData).forEach(([key, info]) => {
      if (!info || !info.url) return;
      const card = document.createElement('div');
      card.className = 'info-card voting-card';
      card.innerHTML = `
        <h3>${info.title || key}</h3>
        <p>${info.desc || ''}</p>
        <a href="${info.url}" target="_blank" class="btn">Go →</a>
      `;
      container.appendChild(card);
    });
  } catch (e) {
    container.innerHTML = '<p>Error loading voting info.</p>';
  }
}

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
  showStartupHub();
  loadAllData();
});
