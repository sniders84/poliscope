// Part 1 — Global setup and DOM references

(() => {
  const FILE_MAP = {
    Senate: 'Senate.json',
    House: 'House.json',
    Governors: 'Governors.json',
    LtGovernors: 'LtGovernors.json'
  };

  const datasets = {}; // cache
  const datasetSelect = document.getElementById('datasetSelect');
  const searchInput = document.getElementById('searchInput');
  const partyFilter = document.getElementById('partyFilter');
  const refreshBtn = document.getElementById('refreshBtn');
  const grid = document.getElementById('grid');
  const empty = document.getElementById('empty');
  const loadedFilesEl = document.getElementById('loadedFiles');
  const summaryEl = document.getElementById('summary');
  // Part 2 — Sanitization + empty state logic

  function sanitizeText(v) {
    if (v === null || v === undefined) return '';
    return String(v);
  }

  function showEmpty(show, message) {
    if (show) {
      empty.classList.remove('hidden');
      empty.textContent = message || 'No results found.';
      grid.innerHTML = '';
      summaryEl.innerHTML = '';
    } else {
      empty.classList.add('hidden');
    }
  }
  // Part 3 — Card rendering logic

  function createCard(item) {
    const card = document.createElement('article');
    card.className = 'card';

    // Hero section
    const hero = document.createElement('div');
    hero.className = 'hero';

    const photoWrap = document.createElement('div');
    photoWrap.className = 'photo';
    const img = document.createElement('img');
    img.alt = sanitizeText(item.name || 'photo');

    if (item.photo) {
      img.src = item.photo;
      img.onerror = () => {
        img.style.display = 'none';
        photoWrap.textContent = (item.name || '').slice(0, 2).toUpperCase();
      };
    } else {
      img.style.display = 'none';
      photoWrap.textContent = (item.name || '').slice(0, 2).toUpperCase();
    }

    photoWrap.appendChild(img);

    const meta = document.createElement('div');
    meta.className = 'meta';
    const title = document.createElement('h3');
    title.textContent = sanitizeText(item.name || 'Unknown');
    const sub = document.createElement('div');
    sub.className = 'sub';
    sub.textContent = `${sanitizeText(item.office || '')} • ${sanitizeText(item.state || '')}${item.district ? ' • District ' + item.district : ''}`;

    meta.appendChild(title);
    meta.appendChild(sub);
    hero.appendChild(photoWrap);
    hero.appendChild(meta);
    card.appendChild(hero);
  // Part 4 — List rendering + summary

  function renderList(items, datasetName) {
    grid.innerHTML = '';

    if (!Array.isArray(items) || !items.length) {
      showEmpty(true, 'No entries in this dataset.');
      loadedFilesEl.textContent = datasetName;
      return;
    }

    showEmpty(false);
    const fragment = document.createDocumentFragment();
    items.forEach(it => fragment.appendChild(createCard(it)));
    grid.appendChild(fragment);

    // Summary stats
    const total = items.length;
    const parties = items.reduce((acc, cur) => {
      const p = cur.party || 'Other';
      acc[p] = (acc[p] || 0) + 1;
      return acc;
    }, {});

    summaryEl.innerHTML = `<div><strong>${datasetName}</strong> — ${total} entries</div>
      <div style="margin-left:12px">${Object.entries(parties).map(([k,v]) => `${k}: ${v}`).join(' • ')}</div>`;
    loadedFilesEl.textContent = datasetName;
  }
  // Part 5 — Filtering logic

  function filterItems(items, q, party) {
    q = (q || '').trim().toLowerCase();
    party = (party || '').trim().toLowerCase();

    return items.filter(it => {
      const matchParty = !party || (it.party || '').toLowerCase() === party;
      if (!matchParty) return false;

      if (!q) return true;

      const haystack = `${it.name || ''} ${it.state || ''} ${it.office || ''} ${it.slug || ''}`.toLowerCase();
      return haystack.includes(q);
    });
  }
  // Part 6 — Dataset loading logic

  async function loadDataset(name, force = false) {
    if (!FILE_MAP[name]) throw new Error('Unknown dataset: ' + name);
    if (datasets[name] && !force) return datasets[name];

    try {
      const res = await fetch(FILE_MAP[name], { cache: 'no-store' });
      if (!res.ok) throw new Error(`Failed to fetch ${FILE_MAP[name]}: ${res.status} ${res.statusText}`);
      const json = await res.json();
      datasets[name] = Array.isArray(json) ? json : [];
      return datasets[name];
    } catch (err) {
      console.error(err);
      datasets[name] = [];
      return datasets[name];
    }
  }
  // Part 7 — Reload and render logic

  async function reloadAndRender() {
    const ds = datasetSelect.value;
    const data = await loadDataset(ds);
    const q = searchInput.value || '';
    const party = partyFilter.value || '';
    const filtered = filterItems(data, q, party);
    renderList(filtered, ds);
  }
  // Part 8 — Event wiring

  datasetSelect.addEventListener('change', () => {
    reloadAndRender();
  });

  searchInput.addEventListener('input', () => {
    reloadAndRender();
  });

  partyFilter.addEventListener('change', () => {
    reloadAndRender();
  });

  refreshBtn.addEventListener('click', async () => {
    const ds = datasetSelect.value;
    datasets[ds] = null; // clear cache
    await loadDataset(ds, true);
    reloadAndRender();
  });
  // Part 9 — Prefetch logic

  async function prefetchAll() {
    const names = Object.keys(FILE_MAP);
    for (const name of names) {
      try {
        await loadDataset(name);
      } catch (err) {
        console.warn(`Prefetch failed for ${name}:`, err);
      }
    }
  }
  // Part 10 — Boot + tab switching logic

  document.addEventListener('DOMContentLoaded', async () => {
    await prefetchAll();
    await reloadAndRender();
  });

  // Optional: wire tab buttons like <button onclick="window.showTab('Senate')">
  window.showTab = function(name) {
    if (!FILE_MAP[name]) {
      console.warn('Unknown tab:', name);
      return;
    }
    datasetSelect.value = name;
    reloadAndRender();
  };
})();
