// script.js - loads provided JSON files and renders a browsable directory
// Expects these files to be reachable in same folder: Senate.json, House.json, Governors.json, LtGovernors.json

(() => {
  const FILE_MAP = {
    Senate: 'Senate.json',
    House: 'House.json',
    Governors: 'Governors.json',
    LtGovernors: 'LtGovernors.json'
  };

  // cached data
  const datasets = {};

  // DOM refs
  const datasetSelect = document.getElementById('datasetSelect');
  const searchInput = document.getElementById('searchInput');
  const partyFilter = document.getElementById('partyFilter');
  const refreshBtn = document.getElementById('refreshBtn');
  const grid = document.getElementById('grid');
  const empty = document.getElementById('empty');
  const loadedFilesEl = document.getElementById('loadedFiles');
  const summaryEl = document.getElementById('summary');

  // helpers
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

  function createCard(item) {
    const card = document.createElement('article');
    card.className = 'card';

    // Hero
    const hero = document.createElement('div');
    hero.className = 'hero';

    const photoWrap = document.createElement('div');
    photoWrap.className = 'photo';
    const img = document.createElement('img');
    img.alt = sanitizeText(item.name || 'photo');
    // Only set src if there's a non-empty photo field
    if (item.photo) {
      img.src = item.photo;
      img.onerror = () => { img.style.display = 'none'; photoWrap.textContent = (item.name || '').slice(0,2).toUpperCase(); };
    } else {
      img.style.display = 'none';
      photoWrap.textContent = (item.name || '').slice(0,2).toUpperCase();
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

    // Body
    const body = document.createElement('div');
    body.className = 'body';

    const partyKV = document.createElement('div'); partyKV.className = 'kv';
    partyKV.innerHTML = `<b>Party</b><div class="val">${sanitizeText(item.party || '') || '—'}</div>`;
    body.appendChild(partyKV);

    if (item.contact && (item.contact.email || item.contact.phone || item.contact.website)) {
      const contactKV = document.createElement('div'); contactKV.className = 'kv';
      let contactHtml = '';
      if (item.contact.email) contactHtml += `Email: ${item.contact.email}<br/>`;
      if (item.contact.phone) contactHtml += `Phone: ${item.contact.phone}<br/>`;
      if (item.contact.website) contactHtml += `Website: ${item.contact.website}`;
      contactKV.innerHTML = `<b>Contact</b><div class="val">${contactHtml}</div>`;
      body.appendChild(contactKV);
    }

    if (item.platform) {
      const plat = document.createElement('div'); plat.className = 'kv';
      plat.innerHTML = `<b>Platform</b><div class="val">${sanitizeText(item.platform)}</div>`;
      body.appendChild(plat);
    }

    // bills or summary
    if (Array.isArray(item.bills) && item.bills.length) {
      const bills = document.createElement('div'); bills.className = 'kv';
      const list = item.bills.slice(0,5).map(b => {
        const title = b.title || b.name || '';
        const link = b.link ? `<a href="${b.link}" target="_blank" rel="noopener noreferrer">${title}</a>` : title;
        return `<div>${link}</div>`;
      }).join('');
      bills.innerHTML = `<b>Bills</b><div class="val">${list}</div>`;
      body.appendChild(bills);
    }

    // actions
    const actions = document.createElement('div'); actions.className = 'actions';
    const viewBtn = document.createElement('a');
    viewBtn.className = 'view';
    viewBtn.href = item.ballotpediaLink || '#';
    viewBtn.textContent = 'Open Ballotpedia';
    viewBtn.target = '_blank'; viewBtn.rel = 'noopener noreferrer';
    if (!item.ballotpediaLink) viewBtn.setAttribute('aria-disabled', 'true');

    const detailsBtn = document.createElement('button');
    detailsBtn.type = 'button';
    detailsBtn.textContent = 'Details';
    detailsBtn.addEventListener('click', () => {
      // expand/collapse a simple details view
      if (card.classList.contains('expanded')) {
        card.classList.remove('expanded');
        detailsBtn.textContent = 'Details';
      } else {
        card.classList.add('expanded');
        detailsBtn.textContent = 'Close';
      }
    });

    actions.appendChild(viewBtn);
    actions.appendChild(detailsBtn);

    card.appendChild(hero);
    card.appendChild(body);
    card.appendChild(actions);

    return card;
  }

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

    // summary
    const total = items.length;
    const parties = items.reduce((acc, cur) => {
      const p = cur.party || 'Other';
      acc[p] = (acc[p] || 0) + 1;
      return acc;
    }, {});
    summaryEl.innerHTML = `<div><strong>${datasetName}</strong> — ${total} entries</div>
      <div style="margin-left:12px">${Object.entries(parties).map(([k,v])=>`${k}: ${v}`).join(' • ')}</div>`;
    loadedFilesEl.textContent = datasetName;
  }

  function filterItems(items, q, party) {
    q = (q || '').trim().toLowerCase();
    return items.filter(it => {
      if (party && (it.party || '').trim().toLowerCase() !== party.trim().toLowerCase()) return false;
      if (!q) return true;
      // search name, state, office, slug
      const hay = `${it.name || ''} ${it.state || ''} ${it.office || ''} ${it.slug || ''}`.toLowerCase();
      return hay.indexOf(q) !== -1;
    });
  }

  async function loadDataset(name, force = false) {
    if (!FILE_MAP[name]) throw new Error('Unknown dataset: ' + name);
    if (datasets[name] && !force) return datasets[name];
    const path = FILE_MAP[name];

    try {
      const res = await fetch(path, {cache: "no-store"});
      if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.status} ${res.statusText}`);
      const json = await res.json();
      // ensure it's an array
      datasets[name] = Array.isArray(json) ? json : [];
      return datasets[name];
    } catch (err) {
      console.error(err);
      datasets[name] = [];
      return datasets[name];
    }
  }

  // wiring
  async function reloadAndRender() {
    const ds = datasetSelect.value;
    const data = await loadDataset(ds);
    const q = searchInput.value || '';
    const party = partyFilter.value || '';
    const filtered = filterItems(data, q, party);
    renderList(filtered, ds);
  }

  // events
  datasetSelect.addEventListener('change', () => {
    // clear search on dataset change to avoid confusion (you can change if you want)
    // searchInput.value = '';
    reloadAndRender();
  });
  searchInput.addEventListener('input', () => reloadAndRender());
  partyFilter.addEventListener('change', () => reloadAndRender());
  refreshBtn.addEventListener('click', async () => {
    // force reload - clear cache and re-fetch
    const ds = datasetSelect.value;
    datasets[ds] = null;
    await loadDataset(ds, true);
    reloadAndRender();
  });

  // initial load: prefetch all files in background to improve responsiveness
  async function prefetchAll() {
    const names = Object.keys(FILE_MAP);
    const results = [];
    for (const n of names) {
      // don't throw if one fails — continue
      try {
        await loadDataset(n);
      } catch (e) {
        // ignore
      }
    }
  }

  // boot
  document.addEventListener('DOMContentLoaded', async () => {
    // prefetch all, then render selected
    await prefetchAll();
    await reloadAndRender();
  });

})();
function openModal(item) {
  const modal = document.getElementById('modal');
  modal.querySelector('.modal-title').textContent = item.name;
  modal.querySelector('.modal-photo').src = item.photo;
  modal.querySelector('.modal-body').textContent = item.platform || 'No platform info';
  modal.style.display = 'block';
}

// Close modal when clicking the X
document.querySelector('.modal-close').addEventListener('click', () => {
  document.getElementById('modal').style.display = 'none';
});

// Close modal when clicking outside the content
window.addEventListener('click', (event) => {
  const modal = document.getElementById('modal');
  if (event.target === modal) {
    modal.style.display = 'none';
  }
});
<script src="script.js"></script>
